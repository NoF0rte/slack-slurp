/*
Copyright © 2022 NAME HERE <EMAIL ADDRESS>
*/
package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

// secretsCmd represents the secrets command
var secretsCmd = &cobra.Command{
	Use:   "secrets",
	Short: "Slurp secrets",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")
		verify, _ := cmd.Flags().GetBool("verify")
		verifiedOnly, _ := cmd.Flags().GetBool("verified")

		if verifiedOnly {
			verify = true
		}

		var err error
		file := os.Stdout
		if output != "-" {
			file, err = os.Create(output)
			if err != nil {
				return err
			}
			defer file.Close()
		}

		fmt.Println("[+] Slurping Secrets...")

		secretChan, errorChan := slurper.GetSecretsAsync(verify)

	Loop:
		for {
			select {
			case secret, ok := <-secretChan:
				if !ok {
					break Loop
				}

				if verifiedOnly {
					secret = secret.Verified()
					if len(secret.Secrets) == 0 { // No verified secrets
						continue
					}
				}

				output, err := secret.ToJson()
				if err != nil {
					close(secretChan)
					close(errorChan)
					return err
				}

				fmt.Fprintln(file, output)
			case err = <-errorChan:
				close(secretChan)
			}
		}
		close(errorChan)

		if err != nil {
			return err
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(secretsCmd)

	secretsCmd.Flags().StringP("output", "o", "slurp-secrets.json", "File to write the output to. Specify '-' for stdout.")
	secretsCmd.Flags().BoolP("verify", "V", false, "Enable verifying slurped secrets.")
	secretsCmd.Flags().Bool("verified", false, "Only output verified secrets. Implies -V.")
}
