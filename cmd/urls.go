package cmd

import (
	"fmt"
	"io"
	"os"
	"time"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// urlsCmd represents the urls command
var urlsCmd = &cobra.Command{
	Use:   "urls",
	Short: "Slurp URLs",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")
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

		file, err := os.Create(output)
		if err != nil {
			return err
		}

		defer file.Close()

		writer := io.MultiWriter(file, os.Stdout)

		fmt.Println("[+] Slurping URLs...")

		urlChan, errorChan := slurper.GetURLsAsync(searchOptions...)

	Loop:
		for {
			select {
			case u, ok := <-urlChan:
				if !ok {
					break Loop
				}

				fmt.Fprintln(writer, u)
			case err = <-errorChan:
				break Loop
			}
		}
		close(errorChan)

		if err != nil {
			return err
		}

		fmt.Printf("[+] Output written to %s\n", output)

		return nil
	},
}

func init() {
	rootCmd.AddCommand(urlsCmd)

	urlsCmd.Flags().StringP("output", "o", "slurp-urls.txt", "File to write the output to.")
	urlsCmd.Flags().StringSliceP("channels", "C", []string{}, "Search within the channels.")
	urlsCmd.Flags().StringSliceP("users", "U", []string{}, "Search from users. Must be usernames.")
	urlsCmd.Flags().String("before", "", "Search before the date.")
	urlsCmd.Flags().String("after", "", "Search after the date.")
}
