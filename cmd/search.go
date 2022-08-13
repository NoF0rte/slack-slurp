package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

// searchCmd represents the search command
var searchCmd = &cobra.Command{
	Use:   "search query",
	Short: "Search slack messages",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		query := strings.Join(args, " ")
		matches, err := slurper.SearchMessages(query)
		if err != nil {
			return err
		}

		for _, match := range matches {
			fmt.Println(match)
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(searchCmd)
}
