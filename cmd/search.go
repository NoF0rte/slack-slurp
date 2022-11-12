package cmd

import (
	"fmt"
	"strings"
	"time"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// searchCmd represents the search command
var searchCmd = &cobra.Command{
	Use:   "search query",
	Short: "Search slack messages",
	Args:  cobra.MinimumNArgs(1),
	RunE: func(cmd *cobra.Command, args []string) error {
		channels, _ := cmd.Flags().GetStringSlice("channels")
		users, _ := cmd.Flags().GetStringSlice("users")
		before, _ := cmd.Flags().GetString("before")
		after, _ := cmd.Flags().GetString("after")

		var options []slurp.SearchOption
		if len(channels) != 0 {
			options = append(options, slurp.SearchInChannels(channels...))
		}

		if len(users) != 0 {
			options = append(options, slurp.SearchFromUsers(users...))
		}

		if before != "" {
			beforeTime, err := time.Parse("2006-01-02", before)
			if err != nil {
				return err
			}

			options = append(options, slurp.SearchBefore(beforeTime))
		}

		if after != "" {
			afterTime, err := time.Parse("2006-01-02", after)
			if err != nil {
				return err
			}

			options = append(options, slurp.SearchAfter(afterTime))
		}

		var err error

		query := strings.Join(args, " ")
		messageChan, errorChan := slurper.SearchMessagesAsync(query, options...)

	Loop:
		for {
			select {
			case message, ok := <-messageChan:
				if !ok {
					break Loop
				}

				fmt.Printf("[+] User: %s\n", message.User)
				fmt.Printf("[+] Channel: %s\n", message.Channel)
				fmt.Printf("[+] Date: %s\n", message.Date)
				fmt.Println(message.Text)
				fmt.Println()

			case err = <-errorChan:
				close(messageChan)
			}
		}
		close(errorChan)

		return err
	},
}

func init() {
	rootCmd.AddCommand(searchCmd)

	searchCmd.Flags().StringSliceP("channels", "C", []string{}, "Search messages within the channels.")
	searchCmd.Flags().StringSliceP("users", "U", []string{}, "Search messages from users. Must be usernames.")
	searchCmd.Flags().String("before", "", "Search messages before the date.")
	searchCmd.Flags().String("after", "", "Search messages after the date.")
}
