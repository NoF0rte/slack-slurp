package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/NoF0rte/slack-slurp/internal/database"
	"github.com/NoF0rte/slack-slurp/internal/websocket"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
	"github.com/slack-go/slack"
)

// APIHandler handles HTTP requests for the API
type APIHandler struct {
	slurper   slurp.Slurper
	dbContext *DBContext
	hub       *websocket.Hub
	// Context for cancelling channel loading operations
	channelCtx    context.Context
	channelCancel context.CancelFunc

	mu        sync.RWMutex
	searchMap map[string]context.CancelFunc
}

type SearchFiltersRequest struct {
	Channels []string `json:"channels"`
	Users    []string `json:"users"`
	Before   string   `json:"before"`
	After    string   `json:"after"`
}

func (o *SearchFiltersRequest) toSearchOptions() ([]slurp.SearchOption, error) {
	var searchOptions []slurp.SearchOption

	if len(o.Channels) != 0 {
		searchOptions = append(searchOptions, slurp.SearchInChannels(o.Channels...))
	}

	if len(o.Users) != 0 {
		searchOptions = append(searchOptions, slurp.SearchFromUsers(o.Users...))
	}

	if o.Before != "" {
		beforeTime, err := time.Parse("2006-01-02", o.Before)
		if err != nil {
			return nil, fmt.Errorf("error parsing 'before' date")
		}

		searchOptions = append(searchOptions, slurp.SearchBefore(beforeTime))
	}

	if o.After != "" {
		afterTime, err := time.Parse("2006-01-02", o.After)
		if err != nil {
			return nil, fmt.Errorf("error parsing 'after' date")
		}

		searchOptions = append(searchOptions, slurp.SearchAfter(afterTime))
	}

	return searchOptions, nil
}

// Request/Response types
type SecretScanRequest struct {
	SearchFiltersRequest
	Detectors    []string `json:"detectors"`
	Verify       bool     `json:"verify"`
	VerifiedOnly bool     `json:"verifiedOnly"`
}

type DetectorInfo struct {
	Name        string   `json:"name"`
	Description string   `json:"description"`
	IsCustom    bool     `json:"isCustom"`
	Keywords    []string `json:"keywords,omitempty"`
}

type CustomDetector struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Keywords    []string `json:"keywords"`
	Patterns    []string `json:"patterns"`
	Description string   `json:"description"`
	CreatedAt   string   `json:"createdAt"`
	UpdatedAt   string   `json:"updatedAt"`
}

type CreateCustomDetectorRequest struct {
	Name        string   `json:"name"`
	Keywords    []string `json:"keywords"`
	Patterns    []string `json:"patterns"`
	Description string   `json:"description"`
}

type UpdateCustomDetectorRequest struct {
	Name        *string  `json:"name,omitempty"`
	Keywords    []string `json:"keywords,omitempty"`
	Patterns    []string `json:"patterns,omitempty"`
	Description *string  `json:"description,omitempty"`
}

type SearchRequest struct {
	SearchFiltersRequest
	Query      string   `json:"query"`
	FileTypes  []string `json:"filetypes,omitempty"`
	SearchType string   `json:"searchType"` // "messages", "files", "both"
}

type DomainResult struct {
	Domain string `json:"domain"`
}

type DomainSearchResponse struct {
	SearchID        string   `json:"searchId"`
	Status          string   `json:"status"`
	TotalFound      int      `json:"totalFound,omitempty"`
	DomainsSearched []string `json:"domainsSearched,omitempty"`
}

type SearchResponse struct {
	SearchID   string `json:"searchId"`
	Status     string `json:"status"`
	Query      string `json:"query"`
	SearchType string `json:"searchType"`
}

type MessageResult struct {
	User    string      `json:"user"`
	Date    time.Time   `json:"date"`
	Channel string      `json:"channel"`
	Text    string      `json:"text"`
	Raw     interface{} `json:"raw"`
}

type FileResult struct {
	ID       string    `json:"id"`
	Name     string    `json:"name"`
	Created  time.Time `json:"created"`
	Channels []string  `json:"channels"`
	Filetype string    `json:"filetype"`
	Size     int       `json:"size"`
	User     string    `json:"user"`
}

type WSMessage struct {
	ID   string      `json:"id,omitempty"`
	Type string      `json:"type"` // "connected", "error", "complete", "domainResult", "urlResult", "messageResult", "fileResult"
	Data interface{} `json:"data"`
}

// Authentication endpoints
func (h *APIHandler) TestAuth(c *gin.Context) {
	authTest, err := h.slurper.AuthTest()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, authTest)
}

func (h *APIHandler) SetupAuth(c *gin.Context) {
	var req struct {
		APIToken string `json:"apiToken"`
		DCookie  string `json:"dCookie"`
		DSCookie string `json:"dsCookie"`
		Name     string `json:"name"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Profile name is required"})
		return
	}

	// Update config temporarily to test credentials
	user := h.slurper.TestCreds(req.APIToken, req.DCookie, req.DSCookie)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials"})
		return
	}

	// If we have a profiles repo, create/update the profile
	if h.dbContext != nil && h.dbContext.profiles != nil {
		// Check if profile with this name already exists
		existing, err := h.dbContext.profiles.GetByName(req.Name)
		if err != nil && err.Error() != "profile with ID 0 not found" {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing profile: " + err.Error()})
			return
		}

		var profile *database.Profile
		if existing != nil {
			// Update existing profile
			existing.APIToken = req.APIToken
			existing.DCookie = req.DCookie
			existing.DSCookie = req.DSCookie
			if err := h.dbContext.profiles.Update(existing); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile: " + err.Error()})
				return
			}
			profile = existing
		} else {
			// Check if this will be the first profile - if so, set as selected
			count, err := h.dbContext.profiles.Count()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count profiles: " + err.Error()})
				return
			}

			// Create new profile
			profile = &database.Profile{
				Name:       req.Name,
				APIToken:   req.APIToken,
				DCookie:    req.DCookie,
				DSCookie:   req.DSCookie,
				IsSelected: count == 0, // First profile is automatically selected
			}

			if err := h.dbContext.profiles.Create(profile); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile: " + err.Error()})
				return
			}
		}

		// If this profile was set as selected, update the slurper
		if profile.IsSelected {
			h.slurper.UpdateCreds(profile.APIToken, profile.DCookie, profile.DSCookie)
		}
	} else {
		// Fallback: update config directly if no database
		h.slurper.UpdateCreds(req.APIToken, req.DCookie, req.DSCookie)
	}

	c.JSON(http.StatusOK, user)
}

// Core operation endpoints
func (h *APIHandler) WhoAmI(c *gin.Context) {
	authTest, err := h.slurper.AuthTest()
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, authTest)
}

func (h *APIHandler) GetChannels(c *gin.Context) {
	t := slurp.ChannelType(c.Query("type"))
	types := []slurp.ChannelType{t}

	if t == "" {
		// Default to all types
		types = []slurp.ChannelType{
			slurp.ChannelPublic,
			slurp.ChannelPrivate,
			slurp.ChannelDirectMessage,
			slurp.ChannelGroupMessage,
		}
	}

	channels, err := h.slurper.GetChannels(types...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, channels)
}

func (h *APIHandler) GetChannelsDetailed(c *gin.Context) {
	t := slurp.ChannelType(c.Query("type"))
	types := []slurp.ChannelType{t}

	if t == "" {
		// Default to all types
		types = []slurp.ChannelType{
			slurp.ChannelPublic,
			slurp.ChannelPrivate,
			slurp.ChannelDirectMessage,
			slurp.ChannelGroupMessage,
		}
	}

	// Cancel any existing channel loading operation
	h.mu.Lock()
	if h.channelCancel != nil {
		h.channelCancel()
	}
	// Create new context for this operation
	h.channelCtx, h.channelCancel = context.WithCancel(context.Background())
	h.mu.Unlock()

	// Start async channels loading and processing
	go h.runChannelsDetailed(h.channelCtx, types)

	c.JSON(http.StatusOK, gin.H{"status": "started"})
}

func (h *APIHandler) StopChannelLoading(c *gin.Context) {
	h.mu.Lock()
	defer h.mu.Unlock()

	if h.channelCancel != nil {
		h.channelCancel()
		h.channelCancel = nil
		h.channelCtx = nil
	}

	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

func (h *APIHandler) GetUsers(c *gin.Context) {
	users, err := h.slurper.GetUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

// Search endpoints

func (h *APIHandler) SearchDomains(c *gin.Context) {
	var req struct {
		SearchFiltersRequest
		Domains []string `json:"domains"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Domains) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No domains provided"})
		return
	}

	searchOptions, err := req.toSearchOptions()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	searchID := generateSearchID()

	ctx, cancel := context.WithCancel(context.Background())

	h.mu.Lock()
	h.searchMap[searchID] = cancel
	h.mu.Unlock()

	// Start async domain search
	go h.runDomainSearch(ctx, searchID, req.Domains, searchOptions)

	c.JSON(http.StatusOK, DomainSearchResponse{
		SearchID:        searchID,
		Status:          "started",
		DomainsSearched: req.Domains,
	})
}

func (h *APIHandler) SearchURLs(c *gin.Context) {
	var options SearchFiltersRequest
	if err := c.ShouldBindJSON(&options); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	searchOptions, err := options.toSearchOptions()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	searchID := generateSearchID()

	ctx, cancel := context.WithCancel(context.Background())

	h.mu.Lock()
	h.searchMap[searchID] = cancel
	h.mu.Unlock()

	// Start async url search
	go h.runURLSearch(ctx, searchID, searchOptions)

	c.JSON(http.StatusOK, gin.H{
		"searchId": searchID,
		"status":   "started",
	})
}

func (h *APIHandler) Search(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	searchOptions, err := req.toSearchOptions()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.FileTypes) != 0 {
		searchOptions = append(searchOptions, slurp.SearchFileTypes(req.FileTypes...))
	}

	searchID := generateSearchID()

	ctx, cancel := context.WithCancel(context.Background())

	h.mu.Lock()
	h.searchMap[searchID] = cancel
	h.mu.Unlock()

	go func() {
		defer func() {
			h.mu.Lock()
			delete(h.searchMap, searchID)
			h.mu.Unlock()
		}()

		var err error
		if req.SearchType == "messages" || req.SearchType == "both" {
			err = h.runMessageSearch(ctx, searchID, req.Query, searchOptions)
		}

		if err != nil && err != context.Canceled {
			h.sendWebSocketMessage(WSMessage{
				Type: "error",
				ID:   searchID,
				Data: map[string]string{"message": "Message search error: " + err.Error()},
			})

			return
		} else if err == context.Canceled { // If canceled, we just want to send a complete message
			h.sendWebSocketMessage(WSMessage{
				Type: "complete",
				ID:   searchID,
			})
			return
		}

		if req.SearchType == "files" || req.SearchType == "both" {
			err = h.runFileSearch(ctx, searchID, req.Query, searchOptions)
		}

		if err != nil && err != context.Canceled {
			h.sendWebSocketMessage(WSMessage{
				Type: "error",
				ID:   searchID,
				Data: map[string]string{"message": "File search error: " + err.Error()},
			})
			return
		}

		h.sendWebSocketMessage(WSMessage{
			Type: "complete",
			ID:   searchID,
		})
	}()

	c.JSON(http.StatusOK, SearchResponse{
		SearchID: searchID,
		Query:    req.Query,
	})
}

func (h *APIHandler) StopSearch(c *gin.Context) {
	searchID := c.Param("id")

	h.mu.Lock()
	defer h.mu.Unlock()

	cancel, ok := h.searchMap[searchID]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "search not found"})
	}

	cancel()

	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

// Secret detection endpoints
func (h *APIHandler) StartSecretScan(c *gin.Context) {
	var req SecretScanRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(req.Detectors) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "detectors must be selected"})
		return
	}

	scanID := generateScanID()

	ctx, cancel := context.WithCancel(context.Background())

	h.mu.Lock()
	h.searchMap[scanID] = cancel
	h.mu.Unlock()

	selectedDetectors := h.dbContext.GetDetectors(req.Detectors...)

	// Create secret options
	secretOptions := []slurp.SecretOption{
		slurp.SecretsDetectors(selectedDetectors...),
		slurp.SecretsVerify(req.Verify),
	}

	if len(req.Channels) != 0 {
		secretOptions = append(secretOptions, slurp.SecretsInChannel(req.Channels...))
	}

	if len(req.Users) != 0 {
		secretOptions = append(secretOptions, slurp.SecretsFromUsers(req.Users...))
	}

	if req.Before != "" {
		beforeTime, err := time.Parse("2006-01-02", req.Before)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Errorf("error parsing 'before' date")})
			return
		}

		secretOptions = append(secretOptions, slurp.SecretsBefore(beforeTime))
	}

	if req.After != "" {
		afterTime, err := time.Parse("2006-01-02", req.After)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Errorf("error parsing 'after' date")})
			return
		}

		secretOptions = append(secretOptions, slurp.SecretsAfter(afterTime))
	}

	// Start async scan
	go h.runSecretScan(ctx, scanID, secretOptions)

	c.JSON(http.StatusOK, gin.H{
		"scanId": scanID,
		"status": "started",
	})
}

func (h *APIHandler) GetScanStatus(c *gin.Context) {
	scanID := c.Param("id")

	// Check if scan is still running
	h.mu.RLock()
	_, isRunning := h.searchMap[scanID]
	h.mu.RUnlock()

	status := "completed"
	if isRunning {
		status = "running"
	}

	c.JSON(http.StatusOK, gin.H{
		"scanId": scanID,
		"status": status,
	})
}

func (h *APIHandler) CancelScan(c *gin.Context) {
	scanID := c.Param("id")

	h.mu.Lock()
	defer h.mu.Unlock()

	cancel, ok := h.searchMap[scanID]
	if !ok {
		c.JSON(http.StatusNotFound, gin.H{"error": "search not found"})
	}

	cancel()

	c.JSON(http.StatusOK, gin.H{"status": "stopped"})
}

func (h *APIHandler) DownloadFile(c *gin.Context) {
	fileID := c.Param("id")

	buffer := bytes.NewBuffer(nil)
	filename, err := h.slurper.DownloadFile(fileID, buffer)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to download file: " + err.Error()})
		return
	}

	c.Writer.Header().Set("Content-Disposition", `attachment; filename="`+filename+`"`)

	io.Copy(c.Writer, buffer)
}

// Detector management functions

// GetBuiltInDetectors returns available built-in detectors
func (h *APIHandler) GetBuiltInDetectors(c *gin.Context) {
	var detectorInfos []DetectorInfo
	for name, detector := range slurp.BuiltInDetectors {
		keywords := []string{}
		// Try to get keywords from detector if it implements Keywords() method
		if keywordDetector, ok := detector.(interface{ Keywords() []string }); ok {
			keywords = keywordDetector.Keywords()
		}
		
		detectorInfos = append(detectorInfos, DetectorInfo{
			Name:        name,
			Description: detector.Description(),
			IsCustom:    false,
			Keywords:    keywords,
		})
	}

	slices.SortFunc(detectorInfos, func(a DetectorInfo, b DetectorInfo) int {
		return strings.Compare(a.Name, b.Name)
	})

	c.JSON(http.StatusOK, detectorInfos)
}

// GetCustomDetectors returns all custom detectors from the database
func (h *APIHandler) GetCustomDetectors(c *gin.Context) {
	repo := h.dbContext.detectors
	if repo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	dbDetectors, err := repo.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load custom detectors: " + err.Error()})
		return
	}

	// Convert database models to API response format
	var detectors []CustomDetector
	for _, dbDet := range dbDetectors {
		detectors = append(detectors, CustomDetector{
			ID:          fmt.Sprintf("%d", dbDet.ID),
			Name:        dbDet.Name,
			Keywords:    []string(dbDet.Keywords),
			Patterns:    []string(dbDet.Patterns),
			Description: dbDet.Description,
			CreatedAt:   dbDet.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   dbDet.UpdatedAt.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, detectors)
}

// CreateCustomDetector creates a new custom detector
func (h *APIHandler) CreateCustomDetector(c *gin.Context) {
	repo := h.dbContext.detectors
	if repo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	var req CreateCustomDetectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate request
	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}
	if len(req.Keywords) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one keyword is required"})
		return
	}
	if len(req.Patterns) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one regex pattern is required"})
		return
	}

	// Validate regex patterns
	for _, pattern := range req.Patterns {
		if _, err := regexp.Compile(pattern); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid regex pattern '%s': %s", pattern, err.Error())})
			return
		}
	}

	// Check for duplicate name
	if repo.Exists(req.Name, nil) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A detector with this name already exists"})
		return
	}

	// Create new detector in database
	dbDetector := &database.CustomDetector{
		Name:        req.Name,
		Keywords:    database.StringArray(req.Keywords),
		Patterns:    database.StringArray(req.Patterns),
		Description: req.Description,
	}

	if err := repo.Create(dbDetector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom detector: " + err.Error()})
		return
	}

	// Convert to API response format
	detector := CustomDetector{
		ID:          fmt.Sprintf("%d", dbDetector.ID),
		Name:        dbDetector.Name,
		Keywords:    []string(dbDetector.Keywords),
		Patterns:    []string(dbDetector.Patterns),
		Description: dbDetector.Description,
		CreatedAt:   dbDetector.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   dbDetector.UpdatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusCreated, detector)
}

// UpdateCustomDetector updates an existing custom detector by ID
func (h *APIHandler) UpdateCustomDetector(c *gin.Context) {
	repo := h.dbContext.detectors
	if repo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	detectorIDStr := c.Param("id")
	detectorID, err := strconv.ParseUint(detectorIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid detector ID"})
		return
	}

	var req UpdateCustomDetectorRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing detector
	dbDetector, err := repo.GetByID(uint(detectorID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Custom detector not found"})
		return
	}

	// Update fields if provided
	if req.Name != nil {
		// Check for duplicate name (excluding current detector)
		excludeID := uint(detectorID)
		if repo.Exists(*req.Name, &excludeID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "A detector with this name already exists"})
			return
		}
		dbDetector.Name = *req.Name
	}
	if req.Description != nil {
		dbDetector.Description = *req.Description
	}
	if req.Keywords != nil {
		dbDetector.Keywords = database.StringArray(req.Keywords)
	}
	if req.Patterns != nil {
		// Validate regex patterns
		for i, pattern := range req.Patterns {
			if _, err := regexp.Compile(pattern); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid regex pattern at index %d: %s", i, err.Error())})
				return
			}
		}
		dbDetector.Patterns = database.StringArray(req.Patterns)
	}

	// Update in database
	if err := repo.Update(dbDetector); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update custom detector: " + err.Error()})
		return
	}

	// Convert to API response format
	detector := CustomDetector{
		ID:          fmt.Sprintf("%d", dbDetector.ID),
		Name:        dbDetector.Name,
		Keywords:    []string(dbDetector.Keywords),
		Patterns:    []string(dbDetector.Patterns),
		Description: dbDetector.Description,
		CreatedAt:   dbDetector.CreatedAt.Format(time.RFC3339),
		UpdatedAt:   dbDetector.UpdatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, detector)
}

// DeleteCustomDetector deletes a custom detector by ID
func (h *APIHandler) DeleteCustomDetector(c *gin.Context) {
	repo := h.dbContext.detectors
	if repo == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	detectorIDStr := c.Param("id")
	detectorID, err := strconv.ParseUint(detectorIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid detector ID"})
		return
	}

	// Verify detector exists
	_, err = repo.GetByID(uint(detectorID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Custom detector not found"})
		return
	}

	// Delete from database
	if err := repo.Delete(uint(detectorID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete custom detector: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Custom detector deleted successfully"})
}

// Profile Management endpoints

// GetProfiles returns all profiles
func (h *APIHandler) GetProfiles(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	profiles, err := h.dbContext.profiles.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load profiles: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, profiles)
}

// GetProfilesCount returns the count of profiles
func (h *APIHandler) GetProfilesCount(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusOK, gin.H{"count": 0})
		return
	}

	count, err := h.dbContext.profiles.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count profiles: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"count": count})
}

// CreateProfile creates a new profile
func (h *APIHandler) CreateProfile(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	var req struct {
		Name     string `json:"name"`
		APIToken string `json:"apiToken"`
		DCookie  string `json:"dCookie"`
		DSCookie string `json:"dsCookie"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
		return
	}

	if req.APIToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "API token is required"})
		return
	}

	// Check for duplicate name
	if h.dbContext.profiles.Exists(req.Name, nil) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "A profile with this name already exists"})
		return
	}

	// Check if this will be the first profile
	count, err := h.dbContext.profiles.Count()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to count profiles: " + err.Error()})
		return
	}

	profile := &database.Profile{
		Name:       req.Name,
		APIToken:   req.APIToken,
		DCookie:    req.DCookie,
		DSCookie:   req.DSCookie,
		IsSelected: count == 0, // First profile is automatically selected
	}

	if err := h.dbContext.profiles.Create(profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create profile: " + err.Error()})
		return
	}

	// If this is the first profile, update slurper
	if profile.IsSelected {
		h.slurper.UpdateCreds(profile.APIToken, profile.DCookie, profile.DSCookie)
	}

	c.JSON(http.StatusCreated, profile)
}

// UpdateProfile updates an existing profile
func (h *APIHandler) UpdateProfile(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	profileIDStr := c.Param("id")
	profileID, err := strconv.ParseUint(profileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	var req struct {
		Name     *string `json:"name,omitempty"`
		APIToken *string `json:"apiToken,omitempty"`
		DCookie  *string `json:"dCookie,omitempty"`
		DSCookie *string `json:"dsCookie,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Get existing profile
	profile, err := h.dbContext.profiles.GetByID(uint(profileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	// Update fields if provided
	if req.Name != nil {
		// Check for duplicate name
		excludeID := uint(profileID)
		if h.dbContext.profiles.Exists(*req.Name, &excludeID) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "A profile with this name already exists"})
			return
		}
		profile.Name = *req.Name
	}
	if req.APIToken != nil {
		profile.APIToken = *req.APIToken
	}
	if req.DCookie != nil {
		profile.DCookie = *req.DCookie
	}
	if req.DSCookie != nil {
		profile.DSCookie = *req.DSCookie
	}

	// Update in database
	if err := h.dbContext.profiles.Update(profile); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile: " + err.Error()})
		return
	}

	// If this profile is selected, update slurper
	if profile.IsSelected {
		h.slurper.UpdateCreds(profile.APIToken, profile.DCookie, profile.DSCookie)
	}

	c.JSON(http.StatusOK, profile)
}

// DeleteProfile deletes a profile by ID
func (h *APIHandler) DeleteProfile(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	profileIDStr := c.Param("id")
	profileID, err := strconv.ParseUint(profileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	// Get profile to check if it's selected
	profile, err := h.dbContext.profiles.GetByID(uint(profileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	// Delete from database
	if err := h.dbContext.profiles.Delete(uint(profileID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete profile: " + err.Error()})
		return
	}

	// If deleted profile was selected, select the first available profile
	if profile.IsSelected {
		profiles, err := h.dbContext.profiles.List()
		if err == nil && len(profiles) > 0 {
			// Select the first profile
			if err := h.dbContext.profiles.SetSelected(profiles[0].ID); err == nil {
				h.slurper.UpdateCreds(profiles[0].APIToken, profiles[0].DCookie, profiles[0].DSCookie)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"message": "Profile deleted successfully"})
}

// SelectProfile sets a profile as selected
func (h *APIHandler) SelectProfile(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.profiles == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	profileIDStr := c.Param("id")
	profileID, err := strconv.ParseUint(profileIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid profile ID"})
		return
	}

	// Verify profile exists
	profile, err := h.dbContext.profiles.GetByID(uint(profileID))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Profile not found"})
		return
	}

	// Set as selected
	if err := h.dbContext.profiles.SetSelected(uint(profileID)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to select profile: " + err.Error()})
		return
	}

	// Update slurper with new credentials
	h.slurper.UpdateCreds(profile.APIToken, profile.DCookie, profile.DSCookie)

	c.JSON(http.StatusOK, profile)
}

func (h *APIHandler) HandleWebSocket(c *gin.Context) {
	websocket.ServeWS(h.hub, c.Writer, c.Request, "dashboard", "dashboard")
}

// Helper functions
func generateScanID() string {
	return fmt.Sprintf("scan%d", time.Now().Unix())
}

func generateSearchID() string {
	return fmt.Sprintf("search%d", time.Now().Unix())
}

func (h *APIHandler) runSecretScan(ctx context.Context, scanID string, secretOptions []slurp.SecretOption) {
	defer func() {
		h.mu.Lock()
		delete(h.searchMap, scanID)
		h.mu.Unlock()
	}()

	var err error

	// Start secret scanning
	secretChan, errorChan := h.slurper.GetSecretsAsyncWithContext(ctx, secretOptions...)

Loop:
	for {
		select {
		case <-ctx.Done():
			err = <-errorChan // The ctx.Err will be coming from the errorChan
			break Loop
		case result, ok := <-secretChan:
			if !ok {
				break Loop
			}

			h.sendWebSocketMessage(WSMessage{
				Type: "secretResult",
				ID:   scanID,
				Data: map[string]interface{}{
					"detector":  result.Type,
					"secrets":   result.Secrets,
					"context":   result.Message.Text,
					"channel":   result.Message.Channel,
					"user":      result.Message.User,
					"timestamp": result.Message.Date.Format(time.RFC3339),
				},
			})

		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil && err != context.Canceled {
		h.sendWebSocketMessage(WSMessage{
			Type: "error",
			ID:   scanID,
			Data: map[string]string{"message": "Search error: " + err.Error()},
		})

		return
	}

	// Send completion message
	h.sendWebSocketMessage(WSMessage{
		Type: "complete",
		ID:   scanID,
	})
}

func (h *APIHandler) runDomainSearch(ctx context.Context, searchID string, domains []string, options []slurp.SearchOption) {
	defer func() {
		h.mu.Lock()
		delete(h.searchMap, searchID)
		h.mu.Unlock()
	}()

	totalFound := 0

	domainChan, errorChan := h.slurper.GetDomainsAsyncWithContext(ctx, domains, options...)

	var err error

Loop:
	for {
		select {
		case <-ctx.Done():
			err = <-errorChan // The ctx.Err will be coming from the errorChan
			break Loop
		case domain, ok := <-domainChan:
			if !ok {
				break Loop
			}
			totalFound++

			h.sendWebSocketMessage(WSMessage{
				Type: "domainResult",
				ID:   searchID,
				Data: DomainResult{
					Domain: domain,
				},
			})
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil && err != context.Canceled {
		h.sendWebSocketMessage(WSMessage{
			Type: "error",
			ID:   searchID,
			Data: map[string]string{"message": "Search error: " + err.Error()},
		})

		return
	}

	// Send completion message
	h.sendWebSocketMessage(WSMessage{
		Type: "complete",
		ID:   searchID,
		Data: map[string]interface{}{
			"totalFound":      totalFound,
			"domainsSearched": domains,
		},
	})
}

func (h *APIHandler) runURLSearch(ctx context.Context, searchID string, options []slurp.SearchOption) {
	defer func() {
		h.mu.Lock()
		delete(h.searchMap, searchID)
		h.mu.Unlock()
	}()

	urlChan, errorChan := h.slurper.GetURLsAsyncWithContext(ctx, options...)

	totalFound := 0

	var err error

Loop:
	for {
		select {
		case <-ctx.Done():
			err = <-errorChan // The ctx.Err will be coming from the errorChan
			break Loop
		case u, ok := <-urlChan:
			if !ok {
				break Loop
			}
			totalFound++

			h.sendWebSocketMessage(WSMessage{
				Type: "urlResult",
				ID:   searchID,
				Data: u,
			})
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil && err != context.Canceled {
		h.sendWebSocketMessage(WSMessage{
			Type: "error",
			ID:   searchID,
			Data: map[string]string{"message": "Search error: " + err.Error()},
		})

		return
	}

	// Send completion message
	h.sendWebSocketMessage(WSMessage{
		Type: "complete",
		ID:   searchID,
		Data: map[string]interface{}{
			"totalFound": totalFound,
		},
	})
}

func (h *APIHandler) runChannelsDetailed(ctx context.Context, types []slurp.ChannelType) {
	// Use a worker pool with 10 goroutines for concurrent processing
	const numWorkers = 10
	resultChan := make(chan slurp.Channel, numWorkers)

	channelChan, errorChan := h.slurper.GetChannelsAsyncWithContext(ctx, types...)

	var wg sync.WaitGroup

	// Start worker goroutines
	for range numWorkers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case channel, ok := <-channelChan:
					if !ok {
						return
					}

					// Check if context is cancelled
					select {
					case <-ctx.Done():
						errorChan <- ctx.Err()
						return
					default:
					}

					latest, err := h.slurper.GetLatestMessage(channel.ID)
					if err != nil {
						errorChan <- fmt.Errorf("latest message error for channel %s: %w", channel.ID, err)
						return
					}

					if latest != nil {
						timestamp := strings.Split(latest.Timestamp, ".")[0]
						t, _ := strconv.Atoi(timestamp)
						channel.Latest = slack.JSONTime(t)
					}

					if channel.IsExternal {
						var sharedTeams []slurp.Team
						chanInfo, err := h.slurper.GetChannelInfo(channel.ID)
						if err == nil {
							for _, teamID := range chanInfo.SharedTeamIDs {
								team, err := h.slurper.GetTeamInfo(teamID)
								if err != nil {
									continue
								}

								icon := team.Icon["image_230"]
								sharedTeams = append(sharedTeams, slurp.Team{
									Name:  team.Name,
									Image: icon.(string),
								})
							}
						}

						channel.SharedTeams = sharedTeams
					}

					resultChan <- channel
				case <-ctx.Done():
					errorChan <- ctx.Err()
					return
				}
			}
		}()
	}

	// Wait for workers to complete
	go func() {
		wg.Wait()
		close(resultChan)
		close(errorChan)
	}()

	// Process results
	for {
		select {
		case channel, ok := <-resultChan:
			if !ok {
				// All results processed
				h.sendWebSocketMessage(WSMessage{
					ID:   "channel",
					Type: "complete",
				})
				return
			}

			h.sendWebSocketMessage(WSMessage{
				ID:   "channel",
				Type: "channelResult",
				Data: channel,
			})

		case err := <-errorChan:
			if err != nil {
				h.sendWebSocketMessage(WSMessage{
					ID:   "channel",
					Type: "error",
					Data: map[string]string{"message": err.Error()},
				})
				return
			}

		case <-ctx.Done():
			h.sendWebSocketMessage(WSMessage{
				ID:   "channel",
				Type: "error",
				Data: map[string]string{"message": "Channel loading cancelled"},
			})
			return
		}
	}
}

func (h *APIHandler) runMessageSearch(ctx context.Context, searchID string, query string, options []slurp.SearchOption) error {
	messageChan, errorChan := h.slurper.SearchMessagesAsyncWithContext(ctx, query, options...)

	var err error

Loop:
	for {
		select {
		case <-ctx.Done():
			err = <-errorChan // The ctx.Err will be coming from the errorChan
			break Loop
		case message, ok := <-messageChan:
			if !ok {
				break Loop
			}

			h.sendWebSocketMessage(WSMessage{
				Type: "messageResult",
				ID:   searchID,
				Data: MessageResult{
					User:    message.User,
					Date:    message.Date,
					Channel: message.Channel,
					Text:    message.Text,
					Raw:     message.Raw,
				},
			})
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil {
		return err
	}

	return nil
}

func (h *APIHandler) runFileSearch(ctx context.Context, searchID string, query string, options []slurp.SearchOption) error {
	fileChan, errorChan := h.slurper.SearchFilesAsyncWithContext(ctx, query, options...)

	var err error

Loop:
	for {
		select {
		case <-ctx.Done():
			err = <-errorChan // The ctx.Err will be coming from the errorChan
			break Loop
		case file, ok := <-fileChan:
			if !ok {
				break Loop
			}

			h.sendWebSocketMessage(WSMessage{
				Type: "fileResult",
				ID:   searchID,
				Data: FileResult{
					ID:       file.Raw.ID,
					Name:     file.Name,
					Created:  file.Created,
					Channels: file.Channels,
					Filetype: file.Filetype,
					Size:     file.Size,
					User:     file.User,
				},
			})
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil {
		return err
	}

	return nil
}

func (h *APIHandler) sendWebSocketMessage(message WSMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		return
	}
	h.hub.BroadcastToType("dashboard", data)
}

// GetGlobalSettings returns the global settings
func (h *APIHandler) GetGlobalSettings(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.globalSettings == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	settings, err := h.dbContext.globalSettings.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get settings: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}

// UpdateGlobalSettings updates the global settings
func (h *APIHandler) UpdateGlobalSettings(c *gin.Context) {
	if h.dbContext == nil || h.dbContext.globalSettings == nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Database not initialized"})
		return
	}

	var req struct {
		ConcurrentGoroutines *int `json:"concurrentGoroutines,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settings, err := h.dbContext.globalSettings.GetSettings()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get settings: " + err.Error()})
		return
	}

	if req.ConcurrentGoroutines != nil {
		if *req.ConcurrentGoroutines < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Concurrent goroutines must be at least 1"})
			return
		}
		if *req.ConcurrentGoroutines > 100 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Concurrent goroutines cannot exceed 100"})
			return
		}
		settings.ConcurrentGoroutines = *req.ConcurrentGoroutines
	}

	if err := h.dbContext.globalSettings.UpdateSettings(settings); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update settings: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, settings)
}
