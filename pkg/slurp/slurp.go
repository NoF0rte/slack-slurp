package slurp

import (
	"context"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"

	"github.com/emirpasic/gods/sets/treeset"
	"github.com/slack-go/slack"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
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
	client    *slack.Client
	config    *Config
	detectors []detectors.Detector
}

func New(cfg *Config) Slurper {
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
		client:    slack.New(cfg.SlackToken, slack.OptionHTTPClient(client)),
		config:    cfg,
		detectors: getDetectors(cfg.Detectors),
	}
}

func (s Slurper) SearchMessages(query string) ([]string, error) {
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

func (s Slurper) SearchFiles(query string) ([]string, error) {
	params := slack.NewSearchParameters()
	search, err := s.client.SearchFiles(query, params)
	if err != nil {
		return nil, err
	}

	var matches []string
	for {
		for _, match := range search.Matches {
			matches = append(matches, match.URLPrivateDownload)
		}

		params.Page++
		if params.Page > search.Paging.Pages {
			break
		}

		search, err = s.client.SearchFiles(query, params)
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
	for _, detector := range s.detectors {
		keywords := detector.Keywords()
		for _, keyword := range keywords {
			messages, err := s.SearchMessages(keyword)
			if err != nil {
				return nil, err
			}

			for _, message := range messages {
				results, err := detector.FromData(context.Background(), false, []byte(message))
				if err != nil {
					return nil, err
				}

				if len(results) > 0 {
					allSecrets = append(allSecrets, message)
				}
			}
		}
	}
	return allSecrets, nil
}

func (s Slurper) GetDomains() ([]string, error) {
	domainChan, errorChan := s.GetDomainsChan()

	var err error
	var allDomains []string

Loop:
	for {
		select {
		case domain, ok := <-domainChan:
			if !ok {
				break Loop
			}
			allDomains = append(allDomains, domain)
		case err = <-errorChan:
			close(domainChan)
		}
	}
	close(errorChan)

	return allDomains, err
}

func (s Slurper) GetDomainsChan() (chan string, chan error) {
	domainChan := make(chan string)
	errorChan := make(chan error)

	go func() {
		domainSet := treeset.NewWithStringComparator()
		for _, domain := range s.config.Domains {
			messages, err := s.SearchMessages(domain)
			if err != nil {
				errorChan <- err
				return
			}

			regex := regexp.MustCompile(fmt.Sprintf(`([0-9a-zA-Z\-\.\*]+)?%s`, regexp.QuoteMeta(domain)))
			for _, message := range messages {
				matches := regex.FindAllString(message, -1)

				for _, match := range matches {
					if domainSet.Contains(match) {
						continue
					}

					domainSet.Add(match)
					domainChan <- match
				}
			}
		}

		close(domainChan)
	}()

	return domainChan, errorChan
}
