package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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
	Channels     []string `json:"channels"`
	Detectors    []string `json:"detectors"`
	Verify       bool     `json:"verify"`
	VerifiedOnly bool     `json:"verified_only"`
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
	Type     string      `json:"type"` // "connected", "error", "complete", "domain_result", "url_result", "message_result", "file_result"
	Data     interface{} `json:"data"`
	ScanID   string      `json:"scan_id,omitempty"`
	SearchID string      `json:"search_id,omitempty"`
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
				Type:     "error",
				SearchID: searchID,
				Data:     map[string]string{"message": "Message search error: " + err.Error()},
			})

			return
		} else if err == context.Canceled { // If canceled, we just want to send a complete message
			h.sendWebSocketMessage(WSMessage{
				Type:     "complete",
				SearchID: searchID,
			})
			return
		}

		if req.SearchType == "files" || req.SearchType == "both" {
			err = h.runFileSearch(ctx, searchID, req.Query, searchOptions)
		}

		if err != nil && err != context.Canceled {
			h.sendWebSocketMessage(WSMessage{
				Type:     "error",
				SearchID: searchID,
				Data:     map[string]string{"message": "File search error: " + err.Error()},
			})
			return
		}

		h.sendWebSocketMessage(WSMessage{
			Type:     "complete",
			SearchID: searchID,
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

	scanID := generateScanID()

	// Start async scan
	go h.runSecretScan(scanID, req)

	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"status":  "started",
	})
}

func (h *APIHandler) GetScanStatus(c *gin.Context) {
	scanID := c.Param("id")

	// TODO: Implement scan status tracking
	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"status":  "running",
	})
}

func (h *APIHandler) GetScanResults(c *gin.Context) {
	scanID := c.Param("id")

	// TODO: Implement scan results storage and retrieval
	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"results": []interface{}{},
	})
}

func (h *APIHandler) CancelScan(c *gin.Context) {
	scanID := c.Param("id")

	// TODO: Implement scan cancellation
	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"status":  "cancelled",
	})
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

func (h *APIHandler) runSecretScan(scanID string, req SecretScanRequest) {
	// TODO: Implement actual secret scanning with WebSocket updates
	// This is a placeholder for the async secret scanning logic
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
				Type:     "domain_result",
				SearchID: searchID,
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
			Type:     "error",
			SearchID: searchID,
			Data:     map[string]string{"message": "Search error: " + err.Error()},
		})

		return
	}

	// Send completion message
	h.sendWebSocketMessage(WSMessage{
		Type:     "complete",
		SearchID: searchID,
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
				Type:     "url_result",
				SearchID: searchID,
				Data:     u,
			})
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	if err != nil && err != context.Canceled {
		h.sendWebSocketMessage(WSMessage{
			Type:     "error",
			SearchID: searchID,
			Data:     map[string]string{"message": "Search error: " + err.Error()},
		})

		return
	}

	// Send completion message
	h.sendWebSocketMessage(WSMessage{
		Type:     "complete",
		SearchID: searchID,
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
					Type: "complete",
				})
				return
			}

			h.sendWebSocketMessage(WSMessage{
				Type: "channel_result",
				Data: channel,
			})

		case err := <-errorChan:
			if err != nil {
				h.sendWebSocketMessage(WSMessage{
					Type: "error",
					Data: map[string]string{"message": err.Error()},
				})
				return
			}

		case <-ctx.Done():
			h.sendWebSocketMessage(WSMessage{
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
				Type:     "message_result",
				SearchID: searchID,
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
				Type:     "file_result",
				SearchID: searchID,
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
