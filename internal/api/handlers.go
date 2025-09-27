package api

import (
	"fmt"
	"net/http"
	"time"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// APIHandler handles HTTP requests for the API
type APIHandler struct {
	slurper slurp.Slurper
	config  *slurp.Config
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

type WSMessage struct {
	Type   string      `json:"type"` // "progress", "result", "error", "complete"
	Data   interface{} `json:"data"`
	ScanID string      `json:"scan_id,omitempty"`
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
	channelTypes := c.QueryArray("type")
	var types []slurp.ChannelType

	if len(channelTypes) == 0 {
		// Default to all types
		types = []slurp.ChannelType{
			slurp.ChannelPublic,
			slurp.ChannelPrivate,
			slurp.ChannelDirectMessage,
			slurp.ChannelGroupMessage,
		}
	} else {
		for _, t := range channelTypes {
			types = append(types, slurp.ChannelType(t))
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

func (h *APIHandler) GetDomains(c *gin.Context) {
	domains := c.QueryArray("domain")

	resultDomains, err := h.slurper.GetDomains(domains...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resultDomains)
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

// WebSocket endpoints
var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for development
	},
}

func (h *APIHandler) HandleScanWebSocket(c *gin.Context) {
	scanID := c.Param("id")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// TODO: Implement WebSocket communication for scan updates
	// For now, just send a test message
	message := WSMessage{
		Type:   "connected",
		Data:   map[string]string{"scan_id": scanID},
		ScanID: scanID,
	}

	if err := conn.WriteJSON(message); err != nil {
		return
	}

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *APIHandler) HandleSearchWebSocket(c *gin.Context) {
	searchID := c.Param("id")

	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// TODO: Implement WebSocket communication for search updates
	message := WSMessage{
		Type: "connected",
		Data: map[string]string{"search_id": searchID},
	}

	if err := conn.WriteJSON(message); err != nil {
		return
	}

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

func (h *APIHandler) HandleDashboardWebSocket(c *gin.Context) {
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	defer conn.Close()

	// TODO: Implement WebSocket communication for dashboard updates
	message := WSMessage{
		Type: "connected",
		Data: map[string]string{"dashboard": "connected"},
	}

	if err := conn.WriteJSON(message); err != nil {
		return
	}

	// Keep connection alive
	for {
		_, _, err := conn.ReadMessage()
		if err != nil {
			break
		}
	}
}

// Helper functions
func generateScanID() string {
	return fmt.Sprintf("scan_%d", time.Now().Unix())
}

func (h *APIHandler) runSecretScan(scanID string, req SecretScanRequest) {
	// TODO: Implement actual secret scanning with WebSocket updates
	// This is a placeholder for the async secret scanning logic
}
