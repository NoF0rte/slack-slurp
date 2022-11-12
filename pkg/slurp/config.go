package slurp

import (
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/auth0managementapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/aws"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/azure"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/censys"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflareapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflarecakey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/digitaloceantoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordbottoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordwebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/dropbox"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gcp"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/generic"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/github"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/github_old"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/githubapp"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gitlab"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gitlabv2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/heroku"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/jiratoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/microsoftteamswebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/okta"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/pastebin"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/privatekey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/shodankey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/slack"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/slackwebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/terraformcloudpersonaltoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/uri"
)

type Config struct {
	APIToken string `mapstructure:"api-token"`
	DCookie  string `mapstructure:"d-cookie"`
	DSCookie string `mapstructure:"ds-cookie"`
	// Files       []string `mapstructure:"files"`
	Domains         []string `mapstructure:"domains"`
	Detectors       []string `mapstructure:"detectors"`
	Threads         int
	CustomDetectors []CustomDetector `mapstructure:"custom-detectors"`
}

func (c Config) getDetectors() []detectors.Detector {
	var selectedDetectors []detectors.Detector
	for _, t := range c.Detectors {
		var detector detectors.Detector
		switch t {
		case "auth0managementapitoken":
			detector = auth0managementapitoken.Scanner{}
		case "aws":
			detector = aws.Scanner{}
		case "azure":
			detector = azure.Scanner{}
		case "censys":
			detector = censys.Scanner{}
		case "cloudflareapitoken":
			detector = cloudflareapitoken.Scanner{}
		case "cloudflarecakey":
			detector = cloudflarecakey.Scanner{}
		case "digitaloceantoken":
			detector = digitaloceantoken.Scanner{}
		case "discordbottoken":
			detector = discordbottoken.Scanner{}
		case "discordwebhook":
			detector = discordwebhook.Scanner{}
		case "dropbox":
			detector = dropbox.Scanner{}
		case "gcp":
			detector = gcp.Scanner{}
		case "generic":
			detector = generic.New()
		case "github":
			detector = github.Scanner{}
		case "github_old":
			detector = github_old.Scanner{}
		case "githubapp":
			detector = githubapp.Scanner{}
		case "gitlab":
			detector = gitlab.Scanner{}
		case "gitlabv2":
			detector = gitlabv2.Scanner{}
		case "heroku":
			detector = heroku.Scanner{}
		case "jiratoken":
			detector = jiratoken.Scanner{}
		case "microsoftteamswebhook":
			detector = microsoftteamswebhook.Scanner{}
		case "okta":
			detector = okta.Scanner{}
		case "pastebin":
			detector = pastebin.Scanner{}
		case "privatekey":
			detector = privatekey.Scanner{}
		case "shodankey":
			detector = shodankey.Scanner{}
		case "slack":
			detector = slack.Scanner{}
		case "slackwebhook":
			detector = slackwebhook.Scanner{}
		case "terraformcloudpersonaltoken":
			detector = terraformcloudpersonaltoken.Scanner{}
		case "uri":
			detector = uri.Scanner{}
		}

		if detector != nil {
			selectedDetectors = append(selectedDetectors, detector)
		}
	}

	if len(c.CustomDetectors) != 0 {
		for _, d := range c.CustomDetectors {
			selectedDetectors = append(selectedDetectors, &d)
		}
	}

	return selectedDetectors
}
