package cmd

import (
	"fmt"
	"io"
	"os"
	"time"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// domainsCmd represents the domains command
var domainsCmd = &cobra.Command{
	Use:   "domains",
	Short: "Slurp domains",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")
		domains, _ := cmd.Flags().GetStringSlice("domains")

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

		fmt.Println("[+] Slurping Domains...")

		domainChan, errorChan := slurper.GetDomainsAsync(domains, searchOptions...)

	Loop:
		for {
			select {
			case domain, ok := <-domainChan:
				if !ok {
					break Loop
				}

				fmt.Fprintln(writer, domain)
			case err = <-errorChan:
				close(domainChan)
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
	rootCmd.AddCommand(domainsCmd)

	domainsCmd.Flags().StringP("output", "o", "slurp-domains.txt", "File to write the output to.")
	domainsCmd.Flags().StringSliceP("domains", "d", []string{}, "The (sub)domains to slurp. Multiple -d flags are accepted. This will override the domains in the config file.")
	domainsCmd.Flags().StringSliceP("channels", "C", []string{}, "Search within the channels.")
	domainsCmd.Flags().StringSliceP("users", "U", []string{}, "Search from users. Must be usernames.")
	domainsCmd.Flags().String("before", "", "Search before the date.")
	domainsCmd.Flags().String("after", "", "Search after the date.")
}
