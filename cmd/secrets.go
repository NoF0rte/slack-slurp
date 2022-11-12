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

		secretChan, errorChan := slurper.GetSecretsAsync()

	Loop:
		for {
			select {
			case secret, ok := <-secretChan:
				if !ok {
					break Loop
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
}
