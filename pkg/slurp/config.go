package slurp

import (
	"strings"

	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/artifactory"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/auth0managementapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/auth0oauth"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/aws"
	awssessionkeys "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/awssessionkeys"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/azure"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/censys"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflareapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflarecakey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/digitaloceantoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordbottoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordwebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/dropbox"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/ftp"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gcp"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gcpapplicationdefaultcredentials"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/generic"
	githubv1 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/github/v1"
	githubv2 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/github/v2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/github_oauth2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/githubapp"
	gitlabv1 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gitlab/v1"
	gitlabv2 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/gitlab/v2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/heroku"
	jiratokenv1 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/jiratoken/v1"
	jiratokenv2 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/jiratoken/v2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/ldap"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/microsoftteamswebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/mongodb"
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

func (c Config) GetDetectors(detectrs ...string) []detectors.Detector {
	defaultDetectors := true
	if len(detectrs) == 0 {
		detectrs = c.Detectors
		defaultDetectors = false
	}

	var selectedDetectors []detectors.Detector
	for _, t := range detectrs {
		var detector detectors.Detector
		switch t {
		case "mongodb":
			detector = mongodb.Scanner{}
		case "ldap":
			detector = ldap.Scanner{}
		case "gcpapplicationdefaultcredentials":
			detector = gcpapplicationdefaultcredentials.Scanner{}
		case "ftp":
			detector = ftp.Scanner{}
		case "auth0oauth":
			detector = auth0oauth.Scanner{}
		case "artifactory":
			detector = artifactory.Scanner{}
		case "auth0managementapitoken":
			detector = auth0managementapitoken.Scanner{}
		case "awssessionkeys":
			detector = awssessionkeys.New()
		case "aws":
			detector = aws.New()
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
		case "githubv1":
			detector = githubv1.Scanner{}
		case "githubv2":
			detector = githubv2.Scanner{}
		case "github_oauth2":
			detector = github_oauth2.Scanner{}
		case "githubapp":
			detector = githubapp.Scanner{}
		case "gitlabv1":
			detector = gitlabv1.Scanner{}
		case "gitlabv2":
			detector = gitlabv2.Scanner{}
		case "heroku":
			detector = heroku.Scanner{}
		case "jiratokenv1":
			detector = jiratokenv1.Scanner{}
		case "jiratokenv2":
			detector = jiratokenv2.Scanner{}
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
		default:
			if !defaultDetectors && len(c.CustomDetectors) != 0 {
				for _, d := range c.CustomDetectors {
					if strings.EqualFold(d.Name, t) {
						selectedDetectors = append(selectedDetectors, &d)
						break
					}
				}
			}
		}

		if detector != nil {
			selectedDetectors = append(selectedDetectors, detector)
		}
	}

	if defaultDetectors && len(c.CustomDetectors) != 0 {
		for _, d := range c.CustomDetectors {
			selectedDetectors = append(selectedDetectors, &d)
		}
	}

	return selectedDetectors
}
