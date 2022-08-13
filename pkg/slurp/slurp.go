package slurp

import (
	"net/http"
	"net/http/cookiejar"
	"net/url"

	"github.com/NoF0rte/slack-slurp/pkg/config"
	"github.com/slack-go/slack"
)

type User struct {
	FirstName string
	LastName  string
	FullName  string
	Email     string
	Title     string
	IsAdmin   bool
	IsBot     bool
	Deleted   bool
}

type Slurper struct {
	client *slack.Client
	config *config.Config
}

func New(cfg *config.Config) Slurper {
	jar, _ := cookiejar.New(nil)
	url, _ := url.Parse("https://slack.com")
	jar.SetCookies(url, []*http.Cookie{
		{
			Name:   "d",
			Value:  cfg.SlackCookie,
			Path:   "/",
			Domain: "slack.com",
		},
	})

	client := &http.Client{
		Jar: jar,
	}

	return Slurper{
		client: slack.New(cfg.SlackToken, slack.OptionHTTPClient(client)),
		config: cfg,
	}
}

func (s Slurper) searchMessages(query string) ([]string, error) {
	params := slack.NewSearchParameters()
	search, err := s.client.SearchMessages(query, params)
	if err != nil {
		return nil, err
	}

	var matches []string
	for {
		for _, match := range search.Matches {
			matches = append(matches, match.Text)
		}

		params.Page++
		if params.Page > search.Paging.Pages {
			break
		}

		search, err = s.client.SearchMessages(query, params)
		if err != nil {
			return nil, err
		}
	}
	return matches, nil
}

func (s Slurper) GetUsers() ([]User, error) {
	slackUsers, err := s.client.GetUsers()
	if err != nil {
		return nil, err
	}

	var users []User
	for _, user := range slackUsers {
		users = append(users, User{
			FirstName: user.Profile.FirstName,
			LastName:  user.Profile.LastName,
			FullName:  user.Profile.RealName,
			Title:     user.Profile.Title,
			Email:     user.Profile.Email,
			IsAdmin:   user.IsAdmin,
			IsBot:     user.IsBot,
			Deleted:   user.Deleted,
		})
	}
	return users, nil
}

func (s Slurper) GetSecrets() ([]string, error) {
	var allSecrets []string
	for _, keyword := range s.config.Secrets {
		secrets, err := s.searchMessages(keyword)
		if err != nil {
			return nil, err
		}

		allSecrets = append(allSecrets, secrets...)
	}
	return allSecrets, nil
}
