package cmd

import (
	"fmt"
	"log"

	"github.com/NoF0rte/slack-slurp/internal/api"
	"github.com/NoF0rte/slack-slurp/internal/middleware"
	"github.com/gin-gonic/gin"
	"github.com/spf13/cobra"
)

// serverCmd represents the server command
var serverCmd = &cobra.Command{
	Use:   "server",
	Short: "Start the web dashboard server",
	Long: `Start the Slack-Slurp web dashboard server.
This provides a web interface for all slack-slurp functionality.`,
	RunE: func(cmd *cobra.Command, args []string) error {
		port, _ := cmd.Flags().GetString("port")

		// Set Gin mode
		// gin.SetMode(gin.ReleaseMode)

		// Create Gin router
		router := gin.Default()

		// Add middleware
		router.Use(middleware.CORS())
		router.Use(middleware.Logger())

		// Setup API routes
		api.SetupRoutes(router, slurper, &config)

		// Serve static files from web/dist directory
		router.Static("/", "./web/dist")

		addr := fmt.Sprintf("localhost:%s", port)
		log.Printf("Starting web server on %s", addr)
		log.Printf("Web dashboard available at http://%s", addr)

		return router.Run(addr)
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)

	serverCmd.Flags().StringP("port", "p", "8000", "Port to run the web server on")
}
