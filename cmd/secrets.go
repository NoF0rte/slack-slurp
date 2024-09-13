package cmd

import (
	"fmt"
	"io"
	"os"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
)

// secretsCmd represents the secrets command
var secretsCmd = &cobra.Command{
	Use:   "secrets",
	Short: "Slurp secrets",
	RunE: func(cmd *cobra.Command, args []string) error {
		channels, _ := cmd.Flags().GetStringSlice("channels")
		detectrs, _ := cmd.Flags().GetStringSlice("detectors")
		output, _ := cmd.Flags().GetString("output")
		verify, _ := cmd.Flags().GetBool("verify")
		verifiedOnly, _ := cmd.Flags().GetBool("verified")

		if verifiedOnly {
			verify = true
		}

		file, err := os.Create(output)
		if err != nil {
			return err
		}

		defer file.Close()

		writer := io.MultiWriter(file, os.Stdout)

		fmt.Println("[+] Slurping Secrets...")

		var secretOptions []slurp.SecretOption
		if verify {
			secretOptions = append(secretOptions, slurp.SecretsVerify(verify))
		}

		if len(detectrs) > 0 {
			secretOptions = append(secretOptions, slurp.SecretsDetectors(config.GetDetectors(detectrs...)...))
		}

		if len(channels) > 0 {
			secretOptions = append(secretOptions, slurp.SecretsInChannel(channels...))
		}

		secretChan, errorChan := slurper.GetSecretsAsync(secretOptions...)

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

				fmt.Fprintln(writer, output)
			case err = <-errorChan:
				close(secretChan)
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
	rootCmd.AddCommand(secretsCmd)

	secretsCmd.Flags().StringP("output", "o", "slurp-secrets.json", "File to write the output to. Specify '-' for stdout.")
	secretsCmd.Flags().BoolP("verify", "V", false, "Enable verifying slurped secrets.")
	secretsCmd.Flags().Bool("verified", false, "Only output verified secrets. Implies -V.")
	secretsCmd.Flags().StringSliceP("detectors", "d", []string{}, "The Trufflehog detectors to use. Multiple -d flags are accepted. This will override the detectors in the config file.")
	secretsCmd.Flags().StringSliceP("channels", "C", []string{}, "Limit secret search to specific channels. Multiple -C flags are accepted")
}
