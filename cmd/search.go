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
		var err error

		query := strings.Join(args, " ")
		messageChan, errorChan := slurper.SearchMessagesAsync(query)

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
}
