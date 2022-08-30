package slurp

type Config struct {
	APIToken string `mapstructure:"api-token"`
	DCookie  string `mapstructure:"d-cookie"`
	// Files       []string `mapstructure:"files"`
	Domains   []string `mapstructure:"domains"`
	Detectors []string `mapstructure:"detectors"`
}
