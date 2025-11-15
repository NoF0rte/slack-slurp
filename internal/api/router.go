package api

import (
	"context"

	"github.com/NoF0rte/slack-slurp/internal/database"
	"github.com/NoF0rte/slack-slurp/internal/websocket"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/gin-gonic/gin"
)

// SetupRoutes configures all API routes
func SetupRoutes(r *gin.Engine, hub *websocket.Hub) {
	// Create API handler
	handler := &APIHandler{
		hub:       hub,
		searchMap: make(map[string]context.CancelFunc),
	}

		// Initialize detector repository if database is available
		if database.DB != nil {
			handler.dbContext = &DBContext{
				profiles:       database.NewProfileRepository(database.DB),
				detectors:      database.NewDetectorRepository(database.DB),
				globalSettings: database.NewGlobalSettingsRepository(database.DB),
			}

			handler.slurper = slurp.New(handler.dbContext)
		}

	// API routes
	api := r.Group("/api")
	{
		// Authentication & Configuration
		api.POST("/auth/test", handler.TestAuth)
		api.POST("/auth/setup", handler.SetupAuth)

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
		api.POST("/secrets/scan/stop/:id", handler.CancelScan)

		// Detector Management
		api.GET("/secrets/detectors", handler.GetBuiltInDetectors)
		api.GET("/secrets/custom-detectors", handler.GetCustomDetectors)
		api.POST("/secrets/custom-detectors", handler.CreateCustomDetector)
		api.PUT("/secrets/custom-detectors/:id", handler.UpdateCustomDetector)
		api.DELETE("/secrets/custom-detectors/:id", handler.DeleteCustomDetector)

		// Profile Management
		api.GET("/profiles", handler.GetProfiles)
		api.GET("/profiles/count", handler.GetProfilesCount)
		api.POST("/profiles", handler.CreateProfile)
		api.PUT("/profiles/:id", handler.UpdateProfile)
		api.DELETE("/profiles/:id", handler.DeleteProfile)
		api.POST("/profiles/:id/select", handler.SelectProfile)

		// Global Settings
		api.GET("/settings/global", handler.GetGlobalSettings)
		api.PUT("/settings/global", handler.UpdateGlobalSettings)

		api.GET("/download/:id", handler.DownloadFile)
	}

	// WebSocket routes
	r.GET("/ws", handler.HandleWebSocket)
}
