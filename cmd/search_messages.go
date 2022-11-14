package cmd

import (
	"fmt"
	"strings"

	"github.com/spf13/cobra"
)

// messagesCmd represents the messages command
var messagesCmd = &cobra.Command{
	Use:   "messages",
	Short: "Search Slack messages",
	RunE: func(cmd *cobra.Command, args []string) error {
		var err error

		query := strings.Join(args, " ")
		messageChan, errorChan := slurper.SearchMessagesAsync(query, searchOptions...)

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
	searchCmd.AddCommand(messagesCmd)
}
