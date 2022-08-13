package config

type Config struct {
	SlackToken  string   `mapstructure:"slack-token"`
	SlackCookie string   `mapstructure:"slack-cookie"`
	Files       []string `mapstructure:"files"`
	Secrets     []string `mapstructure:"secrets"`
	Domains     []string `mapstructure:"domains"`
}
