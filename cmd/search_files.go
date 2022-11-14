package cmd

import (
	"fmt"
	"strings"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// searchFilesCmd represents the files command
var searchFilesCmd = &cobra.Command{
	Use:   "files [query]",
	Short: "Search Slack files",
	RunE: func(cmd *cobra.Command, args []string) error {
		fileTypes, _ := cmd.Flags().GetStringSlice("file-types")
		if len(fileTypes) != 0 {
			searchOptions = append(searchOptions, slurp.SearchFileTypes(fileTypes...))
		}

		var err error

		query := strings.Join(args, " ")
		fileChan, errorChan := slurper.SearchFilesAsync(query, searchOptions...)

	Loop:
		for {
			select {
			case file, ok := <-fileChan:
				if !ok {
					break Loop
				}

				fmt.Printf("[+] Name: %s\n", file.Name)
				fmt.Printf("[+] Created: %s\n", file.Created.Format("Jan 02 2006"))
				fmt.Printf("[+] User: %s\n", file.User)
				fmt.Printf("[+] Channels: %s\n", file.Channels)
				fmt.Printf("[+] URL: %s\n", file.URL)
				fmt.Printf("[+] Filetype: %s\n", file.Filetype)
				fmt.Println()

			case err = <-errorChan:
				close(fileChan)
			}
		}
		close(errorChan)

		return err
	},
}

func init() {
	searchCmd.AddCommand(searchFilesCmd)

	searchFilesCmd.Flags().StringSliceP("file-types", "f", []string{}, "Search specific file types")
}
