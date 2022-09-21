package cmd

import (
	"fmt"

	"github.com/spf13/cobra"
)

// whoamiCmd represents the whoami command
var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Test credentials",
	Run: func(cmd *cobra.Command, args []string) {
		user, err := slurper.AuthTest()
		if err != nil {
			fmt.Println(err)
			return
		}

		fmt.Printf("[+] Current user: %s\n", user)
	},
}

func init() {
	rootCmd.AddCommand(whoamiCmd)
}
