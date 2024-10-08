package cmd

import (
	"fmt"
	"io"
	"os"

	"github.com/spf13/cobra"
)

// domainsCmd represents the domains command
var domainsCmd = &cobra.Command{
	Use:   "domains",
	Short: "Slurp domains",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")
		domains, _ := cmd.Flags().GetStringSlice("domains")

		file, err := os.Create(output)
		if err != nil {
			return err
		}

		defer file.Close()

		writer := io.MultiWriter(file, os.Stdout)

		fmt.Println("[+] Slurping Domains...")

		domainChan, errorChan := slurper.GetDomainsAsync(domains...)

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
}
