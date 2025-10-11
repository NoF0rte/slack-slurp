package api

import (
	"context"

	"github.com/NoF0rte/slack-slurp/internal/websocket"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, slurper slurp.Slurper, config *slurp.Config, hub *websocket.Hub) {
	// Create API handler
	handler := &APIHandler{
		slurper:   slurper,
		config:    config,
		hub:       hub,
		searchMap: make(map[string]context.CancelFunc),
	}

	// API routes
	api := r.Group("/api")
	{
		// Authentication & Configuration
		api.POST("/auth/test", handler.TestAuth)
		api.POST("/auth/setup", handler.SetupAuth)
		api.GET("/config", handler.GetConfig)
		api.PUT("/config", handler.UpdateConfig)

		// Core Operations
		api.GET("/whoami", handler.WhoAmI)
		api.GET("/channels", handler.GetChannels)
		api.GET("/channels/detailed", handler.GetChannelsDetailed)
		api.POST("/channels/detailed/stop", handler.StopChannelLoading)
		api.GET("/users", handler.GetUsers)

		// Search Operations
		api.POST("/search/domains", handler.SearchDomains)
		api.POST("/search/urls", handler.SearchURLs)
		api.POST("/search", handler.Search)
		api.POST("/search/stop/:id", handler.StopSearch)

		// Secret Detection
		api.POST("/secrets/scan", handler.StartSecretScan)
		api.GET("/secrets/status/:id", handler.GetScanStatus)
		api.GET("/secrets/results/:id", handler.GetScanResults)
		api.DELETE("/secrets/:id", handler.CancelScan)

		api.GET("/download/:id", handler.DownloadFile)
	}

	// WebSocket routes
	r.GET("/ws", handler.HandleWebSocket)
}
