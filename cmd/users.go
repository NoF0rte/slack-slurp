package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// usersCmd represents the users command
var usersCmd = &cobra.Command{
	Use:   "users",
	Short: "Slurp users",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")

		file := os.Stdout
		if output != "-" {
			var err error
			file, err = os.Create(output)
			if err != nil {
				return err
			}
			defer file.Close()
		}

		fmt.Println("[+] Slurping Users...")

		users, err := slurper.GetUsers()
		if err != nil {
			return err
		}

		bytes, err := json.MarshalIndent(users, "", "  ")
		if err != nil {
			return err
		}

		fmt.Fprintln(file, string(bytes))

		return nil
	},
}

func init() {
	rootCmd.AddCommand(usersCmd)

	usersCmd.Flags().StringP("output", "o", "slurp-users.json", "File to write the output to. Specify '-' for stdout.")
}
