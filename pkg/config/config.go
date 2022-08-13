package config

type Config struct {
	SlackToken       string   `mapstructure:"slack-token"`
	SlackCookie      string   `mapstructure:"slack-cookie"`
	InterestingFiles []string `mapstructure:"interesting-files"`
	Secrets          []string `mapstructure:"secrets"`
}
