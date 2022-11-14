package cmd

import (
	"os"
	"strings"
	"time"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// searchCmd represents the search command
var searchCmd = &cobra.Command{
	Use:   "search [query]",
	Short: "Search slack messages and files",
	PersistentPreRunE: func(cmd *cobra.Command, args []string) error {
		if cmd.Annotations["PersistentPreRunE"] == "skip" {
			return nil
		}

		cmd.Root().PersistentPreRun(cmd, args) // We must call the rootCmd's PersistentPreRun manually since we define our own

		channels, _ := cmd.Flags().GetStringSlice("channels")
		users, _ := cmd.Flags().GetStringSlice("users")
		before, _ := cmd.Flags().GetString("before")
		after, _ := cmd.Flags().GetString("after")

		if len(channels) != 0 {
			searchOptions = append(searchOptions, slurp.SearchInChannels(channels...))
		}

		if len(users) != 0 {
			searchOptions = append(searchOptions, slurp.SearchFromUsers(users...))
		}

		if before != "" {
			beforeTime, err := time.Parse("2006-01-02", before)
			if err != nil {
				return err
			}

			searchOptions = append(searchOptions, slurp.SearchBefore(beforeTime))
		}

		if after != "" {
			afterTime, err := time.Parse("2006-01-02", after)
			if err != nil {
				return err
			}

			searchOptions = append(searchOptions, slurp.SearchAfter(afterTime))
		}

		return nil
	},
	RunE: func(cmd *cobra.Command, _ []string) error {
		// We don't disable arg parsing for this command so we can get the correct help displayed
		// But because of that, we need to pass all args to the child commands manually
		args := os.Args[2:]
		for _, childCmd := range cmd.Commands() {
			commandPathArgs := strings.Split(childCmd.CommandPath(), " ")[1:]
			cmd.Root().SetArgs(append(commandPathArgs, args...))

			childCmd.Annotations = map[string]string{
				"PersistentPreRunE": "skip",
			}
			childCmd.FParseErrWhitelist.UnknownFlags = true // Must do this so that flags passed to all child commands don't cause the command to error out

			err := childCmd.Execute()
			if err != nil {
				return err
			}
		}
		return nil
	},
}

func init() {
	rootCmd.AddCommand(searchCmd)

	searchCmd.PersistentFlags().StringSliceP("channels", "C", []string{}, "Search within the channels.")
	searchCmd.PersistentFlags().StringSliceP("users", "U", []string{}, "Search from users. Must be usernames.")
	searchCmd.PersistentFlags().String("before", "", "Search before the date.")
	searchCmd.PersistentFlags().String("after", "", "Search after the date.")

	searchCmd.Flags().StringSliceP("file-types", "f", []string{}, "Search specific file types")
}
