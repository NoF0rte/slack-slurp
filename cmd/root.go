package cmd

import (
	"fmt"
	"log"
	"os"
	"reflect"
	"strings"

	"github.com/NoF0rte/slack-slurp/internal/util"
	"github.com/NoF0rte/slack-slurp/pkg/config"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/emirpasic/gods/sets/treeset"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var allSlurps = []string{
	"all",
	"users",
	"links",
	"domains",
	"secrets",
}

var cfgFile string

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "slack-slurp",
	Short: "A brief description of your application",
	RunE: func(cmd *cobra.Command, args []string) error {
		slurpSet := treeset.NewWithStringComparator()

		slurps, _ := cmd.Flags().GetStringSlice("slurp")
		for _, slurp := range slurps {
			slurp = strings.ToLower(slurp)
			if strings.Contains(slurp, "all") {
				for _, s := range allSlurps {
					if s == "all" {
						continue
					}

					slurpSet.Add(s)
				}

				break
			}

			for _, s := range strings.Split(slurp, ",") {
				slurpSet.Add(strings.TrimSpace(s))
			}
		}

		var cfg config.Config
		viper.Unmarshal(&cfg)

		slurper := slurp.New(&cfg)

		for _, v := range slurpSet.Values() {
			switch v.(string) {
			case "users":
				fmt.Println("[+] Slurping Users...")

				users, err := slurper.GetUsers()
				if err != nil {
					return err
				}

				err = util.WriteJson("slurp-users.json", &users)
				if err != nil {
					return err
				}
			case "secrets":
				fmt.Println("[+] Slurping Secrets...")

				secrets, err := slurper.GetSecrets()
				if err != nil {
					return err
				}

				err = util.WriteLines("slurp-secrets.txt", secrets)
				if err != nil {
					return err
				}
			}
		}

		return nil
	},
}

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	cobra.OnInitialize(initConfig)

	rootCmd.PersistentFlags().StringVar(&cfgFile, "config", "", "config file (default is $HOME/.slack-slurp.yaml)")

	rootCmd.Flags().StringP("token", "t", "", "Slack Workspace token. The token should start with XOXC.")
	rootCmd.Flags().StringP("cookie", "c", "", "Slack Workspace cookie. The token should start with XOXD.")
	rootCmd.Flags().StringSliceP("slurp", "s", []string{"all"}, fmt.Sprintf("What to slurp. [%s]", strings.Join(allSlurps, ",")))
	rootCmd.RegisterFlagCompletionFunc("slurp", cobra.FixedCompletions(allSlurps, cobra.ShellCompDirectiveDefault))

	viper.BindPFlag("slack-token", rootCmd.Flags().Lookup("token"))
	viper.BindPFlag("slack-cookie", rootCmd.Flags().Lookup("cookie"))
}

func initConfig() {

	setConfigDefault("secrets", []string{
		"password",
	})
	setConfigDefault("slack-token", "")
	setConfigDefault("slack-cookie", "")

	if cfgFile != "" {
		// Use config file from the flag.
		viper.SetConfigFile(cfgFile)
	} else {
		// Find home directory.
		home, err := os.UserHomeDir()
		cobra.CheckErr(err)

		cwd, err := os.Getwd()
		if err != nil {
			log.Println(err)
		}

		// Search config in home directory with name ".slack-slurp" (without extension).
		viper.AddConfigPath(home)
		viper.AddConfigPath(cwd)
		viper.SetConfigName(".slack-slurp")
	}

	viper.AutomaticEnv() // read in environment variables that match
	viper.ReadInConfig()
}

// If no config file exists, all possible keys in the defaults
// need to be registered with viper otherwise viper will only think
// the keys explicitly set via viper.SetDefault() exist.
func setConfigDefault(key string, value interface{}) {
	valueType := reflect.TypeOf(value)
	valueValue := reflect.ValueOf(value)

	if valueType.Kind() == reflect.Map {
		iter := valueValue.MapRange()
		for iter.Next() {
			k := iter.Key().Interface()
			v := iter.Value().Interface()
			setConfigDefault(fmt.Sprintf("%s.%s", key, k), v)
		}
	} else if valueType.Kind() == reflect.Struct {
		numFields := valueType.NumField()
		for i := 0; i < numFields; i++ {
			structField := valueType.Field(i)
			fieldValue := valueValue.Field(i)

			setConfigDefault(fmt.Sprintf("%s.%s", key, structField.Name), fieldValue.Interface())
		}
	} else {
		viper.SetDefault(key, value)
	}
}
