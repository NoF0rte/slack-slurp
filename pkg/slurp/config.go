package slurp

type Config struct {
	SlackToken  string   `mapstructure:"slack-token"`
	SlackCookie string   `mapstructure:"slack-cookie"`
	Files       []string `mapstructure:"files"`
	Domains     []string `mapstructure:"domains"`
	Detectors   []string `mapstructure:"detectors"`
}
