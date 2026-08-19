package slurp

import (
	"strings"

	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/anthropic"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/artifactory"
	atlassianv1 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/atlassian/v1"
	atlassianv2 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/atlassian/v2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/auth0managementapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/auth0oauth"
	awsaccesskeys "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/aws/access_keys"
	awssessionkeys "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/aws/session_keys"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/azuredirectmanagementkey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/bitbucketapppassword"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/box"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/boxoauth"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/censys"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflareapitoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/cloudflarecakey"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/digitaloceantoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/digitaloceanv2"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordbottoken"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/discordwebhook"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors/docker"
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
	herokuv1 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/heroku/v1"
	herokuv2 "github.com/trufflesecurity/trufflehog/v3/pkg/detectors/heroku/v2"
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

var (
	BuiltInDetectors map[string]detectors.Detector = map[string]detectors.Detector{
		"anthropic":                        anthropic.Scanner{},
		"atlassianv1":                      atlassianv1.Scanner{},
		"atlassianv2":                      atlassianv2.Scanner{},
		"bitbucketapppassword":             bitbucketapppassword.Scanner{},
		"box":                              box.Scanner{},
		"boxoauth":                         boxoauth.Scanner{},
		"digitaloceanv2":                   digitaloceanv2.Scanner{},
		"docker":                           docker.Scanner{},
		"mongodb":                          mongodb.Scanner{},
		"ldap":                             ldap.Scanner{},
		"gcpapplicationdefaultcredentials": gcpapplicationdefaultcredentials.Scanner{},
		"ftp":                              ftp.Scanner{},
		"auth0oauth":                       auth0oauth.Scanner{},
		"artifactory":                      artifactory.Scanner{},
		"auth0managementapitoken":          auth0managementapitoken.Scanner{},
		"awssessionkeys":                   awssessionkeys.New(),
		"awsaccesskeys":                    awsaccesskeys.New(),
		"azuredirectmanagementkey":         azuredirectmanagementkey.Scanner{},
		"censys":                           censys.Scanner{},
		"cloudflareapitoken":               cloudflareapitoken.Scanner{},
		"cloudflarecakey":                  cloudflarecakey.Scanner{},
		"digitaloceantoken":                digitaloceantoken.Scanner{},
		"discordbottoken":                  discordbottoken.Scanner{},
		"discordwebhook":                   discordwebhook.Scanner{},
		"dropbox":                          dropbox.Scanner{},
		"gcp":                              gcp.Scanner{},
		"generic":                          generic.New(),
		"githubv1":                         githubv1.Scanner{},
		"githubv2":                         githubv2.Scanner{},
		"github_oauth2":                    github_oauth2.Scanner{},
		"githubapp":                        githubapp.Scanner{},
		"gitlabv1":                         gitlabv1.Scanner{},
		"gitlabv2":                         gitlabv2.Scanner{},
		"herokuv1":                         herokuv1.Scanner{},
		"herokuv2":                         herokuv2.Scanner{},
		"jiratokenv1":                      jiratokenv1.Scanner{},
		"jiratokenv2":                      jiratokenv2.Scanner{},
		"microsoftteamswebhook":            microsoftteamswebhook.Scanner{},
		"okta":                             okta.Scanner{},
		"pastebin":                         pastebin.Scanner{},
		"privatekey":                       privatekey.Scanner{},
		"shodankey":                        shodankey.Scanner{},
		"slack":                            slack.Scanner{},
		"slackwebhook":                     slackwebhook.Scanner{},
		"terraformcloudpersonaltoken":      terraformcloudpersonaltoken.Scanner{},
		"uri":                              uri.Scanner{},
	}
)

type IConfig interface {
	GetCreds() (string, string, string)
	GetDetectors(detectrs ...string) []detectors.Detector
	Threadss() int
}

type Config struct {
	APIToken string `mapstructure:"api-token" json:"api_token"`
	DCookie  string `mapstructure:"d-cookie" json:"d_cookie"`
	DSCookie string `mapstructure:"ds-cookie" json:"ds_cookie"`
	// Files       []string `mapstructure:"files"`
	Detectors       []string         `mapstructure:"detectors" json:"detectors"`
	Threads         int              `json:"threads"`
	CustomDetectors []CustomDetector `mapstructure:"custom-detectors" json:"custom_detectors"`
}

func (c Config) Threadss() int {
	return c.Threads
}

func (c Config) GetCreds() (string, string, string) {
	return c.APIToken, c.DCookie, c.DSCookie
}

func (c *Config) SetCreds(token string, dCookie string, dsCookie string) {
	c.APIToken = token
	c.DCookie = dCookie
	c.DSCookie = dsCookie
}

func (c Config) GetDetectors(detectrs ...string) []detectors.Detector {
	var selectedDetectors []detectors.Detector

	if len(detectrs) == 0 { // This should mean we should use all builtin and custom detectors
		for _, detector := range BuiltInDetectors {
			selectedDetectors = append(selectedDetectors, detector)
		}

		for _, detector := range c.CustomDetectors {
			selectedDetectors = append(selectedDetectors, &detector)
		}

		return selectedDetectors
	}

	for _, t := range detectrs {
		detector, ok := BuiltInDetectors[t]
		if !ok && len(c.CustomDetectors) != 0 {
			for _, d := range c.CustomDetectors {
				if strings.EqualFold(d.Name, t) {
					detector = &d
					break
				}
			}
		}

		if detector != nil {
			selectedDetectors = append(selectedDetectors, detector)
		}
	}

	return selectedDetectors
}
