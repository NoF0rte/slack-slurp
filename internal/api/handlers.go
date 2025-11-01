package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"slices"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/NoF0rte/slack-slurp/internal/websocket"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
	"github.com/slack-go/slack"
)

// APIHandler handles HTTP requests for the API
type APIHandler struct {
	slurper slurp.Slurper
	config  *slurp.Config
	hub     *websocket.Hub
	// Context for cancelling channel loading operations
	channelCtx    context.Context
	channelCancel context.CancelFunc

	mu        sync.RWMutex
	searchMap map[string]context.CancelFunc

	// Custom detector storage
	customDetectorsPath string
	customDetectorsMu   sync.RWMutex
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
	VerifiedOnly bool     `json:"verified_only"`
}

type DetectorInfo struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	IsCustom    bool   `json:"is_custom"`
}

type CustomDetector struct {
	Name        string   `json:"name"`
	Keywords    []string `json:"keywords"`
	Patterns    []string `json:"patterns"`
	Description string   `json:"description"`
	CreatedAt   string   `json:"created_at"`
	UpdatedAt   string   `json:"updated_at"`
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
	FileTypes  []string `json:"file_types,omitempty"`
	SearchType string   `json:"search_type"` // "messages", "files", "both"
}

type DomainResult struct {
	Domain string `json:"domain"`
}

type DomainSearchResponse struct {
	SearchID        string   `json:"search_id"`
	Status          string   `json:"status"`
	TotalFound      int      `json:"total_found,omitempty"`
	DomainsSearched []string `json:"domains_searched,omitempty"`
}

type SearchResponse struct {
	SearchID   string `json:"search_id"`
	Status     string `json:"status"`
	Query      string `json:"query"`
	SearchType string `json:"search_type"`
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
	Type string      `json:"type"` // "connected", "error", "complete", "domain_result", "url_result", "message_result", "file_result"
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
	var creds struct {
		APIToken string `json:"api_token"`
		DCookie  string `json:"d_cookie"`
		DSCookie string `json:"ds_cookie"`
	}

	if err := c.ShouldBindJSON(&creds); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Update config
	h.slurper.UpdateCreds(creds.APIToken, creds.DCookie, creds.DSCookie)

	// Test the credentials
	authTest, err := h.slurper.AuthTest()
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid credentials: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, authTest)
}

func (h *APIHandler) GetConfig(c *gin.Context) {
	c.JSON(http.StatusOK, h.config)
}

func (h *APIHandler) UpdateConfig(c *gin.Context) {
	if err := c.ShouldBindJSON(h.config); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
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
		"search_id": searchID,
		"status":    "started",
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

	selectedDetectors := h.config.GetDetectors(req.Detectors...)

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
		"scan_id": scanID,
		"status":  "started",
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
		"scan_id": scanID,
		"status":  status,
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
		detectorInfos = append(detectorInfos, DetectorInfo{
			Name:        name,
			Description: detector.Description(),
			IsCustom:    false,
		})
	}

	slices.SortFunc(detectorInfos, func(a DetectorInfo, b DetectorInfo) int {
		return strings.Compare(a.Name, b.Name)
	})

	c.JSON(http.StatusOK, detectorInfos)
}

// GetCustomDetectors returns all custom detectors
// func (h *APIHandler) GetCustomDetectors(c *gin.Context) {
// 	detectors, err := h.loadCustomDetectors()
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load custom detectors: " + err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, detectors)
// }

// CreateCustomDetector creates a new custom detector
// func (h *APIHandler) CreateCustomDetector(c *gin.Context) {
// 	var req CreateCustomDetectorRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}

// 	// Validate request
// 	if req.Name == "" {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Name is required"})
// 		return
// 	}
// 	if req.Description == "" {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "Description is required"})
// 		return
// 	}
// 	if len(req.Keywords) == 0 {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one keyword is required"})
// 		return
// 	}
// 	if len(req.Patterns) == 0 {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": "At least one regex pattern is required"})
// 		return
// 	}

// 	// Validate regex patterns
// 	for i, pattern := range req.Patterns {
// 		if _, err := regexp.Compile(pattern); err != nil {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid regex pattern at index %d: %s", i, err.Error())})
// 			return
// 		}
// 	}

// 	// Load existing detectors
// 	detectors, err := h.loadCustomDetectors()
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load custom detectors: " + err.Error()})
// 		return
// 	}

// 	// Check for duplicate name
// 	for _, detector := range detectors {
// 		if detector.Name == req.Name {
// 			c.JSON(http.StatusBadRequest, gin.H{"error": "A detector with this name already exists"})
// 			return
// 		}
// 	}

// 	// Create new detector
// 	now := time.Now().Format(time.RFC3339)
// 	detector := CustomDetector{
// 		Name:        req.Name,
// 		Keywords:    req.Keywords,
// 		Patterns:    req.Patterns,
// 		Description: req.Description,
// 		CreatedAt:   now,
// 		UpdatedAt:   now,
// 	}

// 	// Add to list and save
// 	detectors = append(detectors, detector)
// 	if err := h.saveCustomDetectors(detectors); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save custom detector: " + err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusCreated, detector)
// }

// UpdateCustomDetector updates an existing custom detector
// func (h *APIHandler) UpdateCustomDetector(c *gin.Context) {
// 	oldDetectorName := c.Param("name")

// 	var req UpdateCustomDetectorRequest
// 	if err := c.ShouldBindJSON(&req); err != nil {
// 		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
// 		return
// 	}

// 	// Load existing detectors
// 	detectors, err := h.loadCustomDetectors()
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load custom detectors: " + err.Error()})
// 		return
// 	}

// 	// Find detector
// 	var detector *CustomDetector
// 	for _, d := range detectors {
// 		if d.Name == oldDetectorName {
// 			detector = &d
// 			break
// 		}
// 	}

// 	if detector == nil {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Custom detector not found"})
// 		return
// 	}

// 	// Update fields
// 	if req.Name != nil {
// 		// Check for duplicate name
// 		for _, d := range detectors {
// 			if d.Name != oldDetectorName && d.Name == *req.Name {
// 				c.JSON(http.StatusBadRequest, gin.H{"error": "A detector with this name already exists"})
// 				return
// 			}
// 		}
// 		detector.Name = *req.Name
// 	}
// 	if req.Description != nil {
// 		detector.Description = *req.Description
// 	}
// 	if req.Keywords != nil {
// 		detector.Keywords = req.Keywords
// 	}
// 	if req.Patterns != nil {
// 		// Validate regex patterns
// 		for i, pattern := range req.Patterns {
// 			if _, err := regexp.Compile(pattern); err != nil {
// 				c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid regex pattern at index %d: %s", i, err.Error())})
// 				return
// 			}
// 		}
// 		detector.Patterns = req.Patterns
// 	}

// 	detector.UpdatedAt = time.Now().Format(time.RFC3339)

// 	// Save updated detectors
// 	if err := h.saveCustomDetectors(detectors); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save custom detector: " + err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, detector)
// }

// DeleteCustomDetector deletes a custom detector
// func (h *APIHandler) DeleteCustomDetector(c *gin.Context) {
// 	detectorID := c.Param("id")

// 	// Load existing detectors
// 	detectors, err := h.loadCustomDetectors()
// 	if err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to load custom detectors: " + err.Error()})
// 		return
// 	}

// 	// Find and remove detector
// 	var found bool
// 	for i, detector := range detectors {
// 		if detector.ID == detectorID {
// 			detectors = append(detectors[:i], detectors[i+1:]...)
// 			found = true
// 			break
// 		}
// 	}

// 	if !found {
// 		c.JSON(http.StatusNotFound, gin.H{"error": "Custom detector not found"})
// 		return
// 	}

// 	// Save updated detectors
// 	if err := h.saveCustomDetectors(detectors); err != nil {
// 		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save custom detector: " + err.Error()})
// 		return
// 	}

// 	c.JSON(http.StatusOK, gin.H{"message": "Custom detector deleted successfully"})
// }

// Helper functions for custom detector storage

func (h *APIHandler) getCustomDetectorsPath() string {
	if h.customDetectorsPath == "" {
		// Use current directory for now, in production this should be configurable
		h.customDetectorsPath = filepath.Join(".", "custom_detectors.json")
	}
	return h.customDetectorsPath
}

func (h *APIHandler) loadCustomDetectors() ([]CustomDetector, error) {
	h.customDetectorsMu.RLock()
	defer h.customDetectorsMu.RUnlock()

	path := h.getCustomDetectorsPath()

	// Check if file exists
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return []CustomDetector{}, nil
	}

	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}

	var detectors []CustomDetector
	if err := json.Unmarshal(data, &detectors); err != nil {
		return nil, err
	}

	return detectors, nil
}

func (h *APIHandler) saveCustomDetectors(detectors []CustomDetector) error {
	h.customDetectorsMu.Lock()
	defer h.customDetectorsMu.Unlock()

	path := h.getCustomDetectorsPath()

	// Ensure directory exists
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return err
	}

	data, err := json.MarshalIndent(detectors, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func (h *APIHandler) HandleWebSocket(c *gin.Context) {
	websocket.ServeWS(h.hub, c.Writer, c.Request, "dashboard", "dashboard")
}

// Helper functions
func generateScanID() string {
	return fmt.Sprintf("scan_%d", time.Now().Unix())
}

func generateSearchID() string {
	return fmt.Sprintf("search_%d", time.Now().Unix())
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
				Type: "secret_result",
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
				Type: "domain_result",
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
			"total_found":      totalFound,
			"domains_searched": domains,
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
				Type: "url_result",
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
			"total_found": totalFound,
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
				Type: "channel_result",
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
				Type: "message_result",
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
				Type: "file_result",
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
