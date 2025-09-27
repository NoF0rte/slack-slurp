package api

import (
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, slurper slurp.Slurper, config *slurp.Config) {
	// Create API handler
	handler := &APIHandler{
		slurper: slurper,
		config:  config,
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
		api.GET("/users", handler.GetUsers)
		api.GET("/domains", handler.GetDomains)
		
		// Search Operations
		api.POST("/search/messages", handler.SearchMessages)
		api.POST("/search/files", handler.SearchFiles)
		api.GET("/search/history", handler.GetSearchHistory)
		
		// Secret Detection
		api.POST("/secrets/scan", handler.StartSecretScan)
		api.GET("/secrets/status/:id", handler.GetScanStatus)
		api.GET("/secrets/results/:id", handler.GetScanResults)
		api.DELETE("/secrets/:id", handler.CancelScan)
		
		// Export & Download
		api.GET("/export/secrets/:id", handler.ExportSecrets)
		api.GET("/export/messages/:id", handler.ExportMessages)
		api.GET("/download/file/:id", handler.DownloadFile)
	}
	
	// WebSocket routes
	r.GET("/ws/scan/:id", handler.HandleScanWebSocket)
	r.GET("/ws/search/:id", handler.HandleSearchWebSocket)
	r.GET("/ws/dashboard", handler.HandleDashboardWebSocket)
}