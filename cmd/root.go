package cmd

import (
	"fmt"
	"log"
	"os"
	"reflect"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

var cfgFile string
var config slurp.Config
var slurper slurp.Slurper
var searchOptions []slurp.SearchOption

// rootCmd represents the base command when called without any subcommands
var rootCmd = &cobra.Command{
	Use:   "slack-slurp",
	Short: "Slurp juicy slack related info",
	PersistentPreRun: func(cmd *cobra.Command, args []string) {
		viper.Unmarshal(&config)

		threads, _ := cmd.Flags().GetInt("threads")
		config.Threads = threads

		slurper = slurp.New(&config)
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
	rootCmd.PersistentFlags().Int("threads", 10, "Number of threads to use")
	rootCmd.PersistentFlags().StringP("token", "t", "", "Slack API token. The token should start with xoxc if authenticating as a normal user or xoxb if authenticating as a bot.")
	rootCmd.PersistentFlags().StringP("cookie", "c", "", "Slack d cookie. The token should start with xoxd. This is not needed if authenticated as a bot.")
	rootCmd.PersistentFlags().String("ds-cookie", "", "Slack d-s cookie. This is not needed if authenticated as a bot.")

	viper.BindPFlag("api-token", rootCmd.PersistentFlags().Lookup("token"))
	viper.BindPFlag("d-cookie", rootCmd.PersistentFlags().Lookup("cookie"))
	viper.BindPFlag("ds-cookie", rootCmd.PersistentFlags().Lookup("ds-cookie"))
}

func initConfig() {
	setConfigDefault("detectors", []string{
		"mongodb",
		"ldap",
		"auth0managementapitoken",
		"aws",
		"azure",
		"artifactory",
		"auth0oauth",
		"awssessionkeys",
		"censys",
		"cloudflareapitoken",
		"cloudflarecakey",
		"digitaloceantoken",
		"discordbottoken",
		"discordwebhook",
		"dropbox",
		"gcp",
		"gcpapplicationdefaultcredentials",
		"generic",
		"githubv1",
		"githubv2",
		"github_oauth2",
		"githubapp",
		"gitlabv1",
		"gitlabv2",
		"heroku",
		"jiratokenv1",
		"jiratokenv2",
		"microsoftteamswebhook",
		"okta",
		"ftp",
		"pastebin",
		"privatekey",
		"shodankey",
		"slack",
		"slackwebhook",
		"terraformcloudpersonaltoken",
		"uri",
	})
	setConfigDefault("custom-detectors", []string{})

	setConfigDefault("domains", []string{})
	setConfigDefault("api-token", "")
	setConfigDefault("d-cookie", "")
	setConfigDefault("ds-cookie", "")

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
