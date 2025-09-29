package cmd

import (
	"fmt"
	"net/http"
	"path/filepath"

	"github.com/NoF0rte/slack-slurp/internal/api"
	"github.com/NoF0rte/slack-slurp/internal/static"
	"github.com/NoF0rte/slack-slurp/internal/websocket"
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

		// Create WebSocket hub
		hub := websocket.NewHub()
		go hub.Run()

		// Create Gin router
		router := gin.Default()

		// Setup API routes
		api.SetupRoutes(router, slurper, &config, hub)

		// Serve static files from embedded FS
		router.StaticFileFS("/", "/", http.FS(static.FS)) // Must be / that we query from the embedded FS, otherwise Gin will go into a redirect loop
		router.GET("/assets/*filepath", func(ctx *gin.Context) {
			file, _ := ctx.Params.Get("filepath")
			ctx.FileFromFS(filepath.Join("assets", file), http.FS(static.FS))
		})

		addr := fmt.Sprintf("localhost:%s", port)
		return router.Run(addr)
	},
}

func init() {
	rootCmd.AddCommand(serverCmd)

	serverCmd.Flags().StringP("port", "p", "8000", "Port to run the web server on")
}
