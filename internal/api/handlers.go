package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/NoF0rte/slack-slurp/internal/websocket"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
)

// APIHandler handles HTTP requests for the API
type APIHandler struct {
	slurper slurp.Slurper
	config  *slurp.Config
	hub     *websocket.Hub
}

// Request/Response types
type SecretScanRequest struct {
	Channels     []string `json:"channels"`
	Detectors    []string `json:"detectors"`
	Verify       bool     `json:"verify"`
	VerifiedOnly bool     `json:"verified_only"`
}

type SearchRequest struct {
	Query     string    `json:"query"`
	Channels  []string  `json:"channels"`
	Users     []string  `json:"users"`
	Before    time.Time `json:"before,omitempty"`
	After     time.Time `json:"after,omitempty"`
	FileTypes []string  `json:"file_types,omitempty"`
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

type WSMessage struct {
	Type     string      `json:"type"` // "connected", "error", "complete", "domain_result", "url_result"
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

func (h *APIHandler) GetUsers(c *gin.Context) {
	users, err := h.slurper.GetUsers()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, users)
}

func (h *APIHandler) SearchDomains(c *gin.Context) {
	var req struct {
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

	searchID := generateSearchID()

	// Start async domain search
	go h.runDomainSearch(searchID, req.Domains)

	c.JSON(http.StatusOK, DomainSearchResponse{
		SearchID:        searchID,
		Status:          "started",
		DomainsSearched: req.Domains,
	})
}

func (h *APIHandler) StopDomainSearch(c *gin.Context) {
	searchID := c.Param("id")

	// TODO: Implement domain search cancellation
	// For now, just return success
	c.JSON(http.StatusOK, gin.H{
		"search_id": searchID,
		"status":    "cancelled",
	})
}

func (h *APIHandler) SearchURLs(c *gin.Context) {
	var options struct {
		Channels []string `json:"channels"`
		Users    []string `json:"users"`
		Before   string   `json:"before"`
		After    string   `json:"after"`
	}

	if err := c.ShouldBindJSON(&options); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var searchOptions []slurp.SearchOption

	if len(options.Channels) != 0 {
		searchOptions = append(searchOptions, slurp.SearchInChannels(options.Channels...))
	}

	if len(options.Users) != 0 {
		searchOptions = append(searchOptions, slurp.SearchFromUsers(options.Users...))
	}

	if options.Before != "" {
		beforeTime, err := time.Parse("2006-01-02", options.Before)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing 'before' date"})
			return
		}

		searchOptions = append(searchOptions, slurp.SearchBefore(beforeTime))
	}

	if options.After != "" {
		afterTime, err := time.Parse("2006-01-02", options.After)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Error parsing 'after' date"})
			return
		}

		searchOptions = append(searchOptions, slurp.SearchAfter(afterTime))
	}

	searchID := generateSearchID()

	// Start async url search
	go h.runURLSearch(searchID, searchOptions)

	c.JSON(http.StatusOK, gin.H{
		"search_id": searchID,
		"status":    "started",
	})
}

// Search endpoints
func (h *APIHandler) SearchMessages(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build search options
	var options []slurp.SearchOption
	if len(req.Channels) > 0 {
		options = append(options, slurp.SearchInChannels(req.Channels...))
	}
	if len(req.Users) > 0 {
		options = append(options, slurp.SearchFromUsers(req.Users...))
	}
	if !req.Before.IsZero() {
		options = append(options, slurp.SearchBefore(req.Before))
	}
	if !req.After.IsZero() {
		options = append(options, slurp.SearchAfter(req.After))
	}

	messages, err := h.slurper.SearchMessages(req.Query, options...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, messages)
}

func (h *APIHandler) SearchFiles(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Build search options
	var options []slurp.SearchOption
	if len(req.Channels) > 0 {
		options = append(options, slurp.SearchInChannels(req.Channels...))
	}
	if len(req.Users) > 0 {
		options = append(options, slurp.SearchFromUsers(req.Users...))
	}
	if !req.Before.IsZero() {
		options = append(options, slurp.SearchBefore(req.Before))
	}
	if !req.After.IsZero() {
		options = append(options, slurp.SearchAfter(req.After))
	}
	if len(req.FileTypes) > 0 {
		options = append(options, slurp.SearchFileTypes(req.FileTypes...))
	}

	files, err := h.slurper.SearchFiles(req.Query, options...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, files)
}

func (h *APIHandler) GetSearchHistory(c *gin.Context) {
	// TODO: Implement search history storage
	c.JSON(http.StatusOK, []interface{}{})
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

// Export endpoints
func (h *APIHandler) ExportSecrets(c *gin.Context) {
	scanID := c.Param("id")

	// TODO: Implement secret export
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=secrets_%s.json", scanID))
	c.JSON(http.StatusOK, gin.H{
		"scan_id": scanID,
		"secrets": []interface{}{},
	})
}

func (h *APIHandler) ExportMessages(c *gin.Context) {
	searchID := c.Param("id")

	// TODO: Implement message export
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=messages_%s.json", searchID))
	c.JSON(http.StatusOK, gin.H{
		"search_id": searchID,
		"messages":  []interface{}{},
	})
}

func (h *APIHandler) DownloadFile(c *gin.Context) {
	// TODO: Implement file download
	c.JSON(http.StatusNotImplemented, gin.H{"error": "File download not implemented"})
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

func (h *APIHandler) runDomainSearch(searchID string, domains []string) {
	totalFound := 0

	domainChan, errorChan := h.slurper.GetDomainsAsync(domains...)

	var err error

Loop:
	for {
		select {
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
			close(domainChan)
		}
	}
	close(errorChan)

	if err != nil {
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

func (h *APIHandler) runURLSearch(searchID string, options []slurp.SearchOption) {
	urlChan, errorChan := h.slurper.GetURLsAsync(options...)

	totalFound := 0

	var err error

Loop:
	for {
		select {
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
			close(urlChan)
		}
	}
	close(errorChan)

	if err != nil {
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

func (h *APIHandler) sendWebSocketMessage(message WSMessage) {
	data, err := json.Marshal(message)
	if err != nil {
		return
	}
	h.hub.BroadcastToType("dashboard", data)
}
