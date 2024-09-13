package cmd

import (
	"encoding/json"
	"fmt"

	"github.com/spf13/cobra"
)

// whoamiCmd represents the whoami command
var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Test credentials",
	Run: func(cmd *cobra.Command, args []string) {
		authTest, err := slurper.AuthTest()
		if err != nil {
			fmt.Println(err)
			return
		}

		bytes, _ := json.MarshalIndent(authTest, "", "  ")
		fmt.Println(string(bytes))
	},
}

func init() {
	rootCmd.AddCommand(whoamiCmd)
}
