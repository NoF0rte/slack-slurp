package slurp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"

	"github.com/emirpasic/gods/sets/treeset"
	"github.com/slack-go/slack"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
)

type ChannelType string

const (
	ChannelPublic        ChannelType = "public_channel"
	ChannelPrivate       ChannelType = "private_channel"
	ChannelDirectMessage ChannelType = "im"
	ChannelGroupMessage  ChannelType = "mpim"
)

type Channel struct {
	ID             string
	Name           string
	IsPrivate      bool
	IsGroup        bool
	IsDM           bool
	IsGroupMessage bool
}

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

type Secret struct {
	// Raw contains the raw secret identifier data.
	Raw      string
	Verified bool
}

type SecretResult struct {
	Type    string
	Message string
	Secrets []Secret
}

func (s SecretResult) ToJson() (string, error) {
	bytes, err := json.MarshalIndent(&s, "", "  ")
	if err != nil {
		return "", err
	}

	return string(bytes), nil
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
	var err error
	var messages []string

	messageChan, errorChan := s.SearchMessagesChan(query)

Loop:
	for {
		select {
		case message, ok := <-messageChan:
			if !ok {
				break Loop
			}
			messages = append(messages, message)
		case err = <-errorChan:
			close(messageChan)
		}
	}
	close(errorChan)

	return messages, err
}

func (s Slurper) SearchMessagesChan(query string) (chan string, chan error) {
	params := slack.NewSearchParameters()
	messageChan := make(chan string)
	errorChan := make(chan error)

	go func() {
		search, err := s.client.SearchMessages(query, params)
		if err != nil {
			errorChan <- err
			return
		}

		for {
			for _, match := range search.Matches {
				messageChan <- match.Text
			}

			params.Page++
			if params.Page > search.Paging.Pages {
				break
			}

			search, err = s.client.SearchMessages(query, params)
			if err != nil && err.Error() == "internal_error" {
				params.Page++
				search, err = s.client.SearchMessages(query, params)
			}

			if err != nil {
				errorChan <- err
				return
			}
		}
		close(messageChan)
	}()

	return messageChan, errorChan
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

func (s Slurper) GetSecrets() ([]SecretResult, error) {
	var err error
	var allSecrets []SecretResult

	secretChan, errorChan := s.GetSecretsChan()

Loop:
	for {
		select {
		case secret, ok := <-secretChan:
			if !ok {
				break Loop
			}
			allSecrets = append(allSecrets, secret)
		case err = <-errorChan:
			close(secretChan)
		}
	}
	close(errorChan)

	return allSecrets, err
}

func (s Slurper) GetSecretsChan() (chan SecretResult, chan error) {
	secretChan := make(chan SecretResult)
	errorChan := make(chan error)

	go func() {
		for _, detector := range s.detectors {
			var err error
			keywords := detector.Keywords()
			for _, keyword := range keywords {
				messageChan, err2Chan := s.SearchMessagesChan(fmt.Sprintf("%s*", keyword))

			Loop:
				for {
					select {
					case message, ok := <-messageChan:
						if !ok {
							break Loop
						}

						results, err := detector.FromData(context.Background(), false, []byte(message))
						if err != nil {
							errorChan <- err
							return
						}

						if len(results) == 0 {
							continue
						}

						var secrets []Secret
						for _, result := range results {
							secrets = append(secrets, Secret{
								Raw:      string(result.Raw),
								Verified: result.Verified,
							})
						}

						secretChan <- SecretResult{
							Message: message,
							Type:    results[0].DetectorType.String(),
							Secrets: secrets,
						}
					case err = <-err2Chan:
						close(messageChan)
					}
				}
				close(err2Chan)

				if err != nil {
					errorChan <- err
					return
				}
			}
		}

		close(secretChan)
	}()

	return secretChan, errorChan
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
			var err error
			regex := regexp.MustCompile(fmt.Sprintf(`([0-9a-zA-Z\-\.\*]+)?%s`, regexp.QuoteMeta(domain)))
			messageChan, err2Chan := s.SearchMessagesChan(domain)

		Loop:
			for {
				select {
				case message, ok := <-messageChan:
					if !ok {
						break Loop
					}
					matches := regex.FindAllString(message, -1)

					for _, match := range matches {
						if domainSet.Contains(match) {
							continue
						}

						domainSet.Add(match)
						domainChan <- match
					}
				case err = <-err2Chan:
					close(messageChan)
				}
			}
			close(err2Chan)

			if err != nil {
				errorChan <- err
				return
			}
		}

		close(domainChan)
	}()

	return domainChan, errorChan
}

func (s Slurper) GetChannels(channelTypes ...ChannelType) ([]Channel, error) {
	var allChannels []Channel
	var types []string
	for _, t := range channelTypes {
		types = append(types, string(t))
	}

	params := &slack.GetConversationsParameters{
		Types: types,
	}
	channels, cursor, err := s.client.GetConversations(params)
	if err != nil {
		return nil, err
	}

	for {
		for _, channel := range channels {
			allChannels = append(allChannels, Channel{
				ID:             channel.ID,
				Name:           channel.Name,
				IsPrivate:      channel.IsPrivate,
				IsGroup:        channel.IsGroup,
				IsDM:           channel.IsIM,
				IsGroupMessage: channel.IsMpIM,
			})
		}

		if cursor == "" {
			break
		}

		params.Cursor = cursor

		channels, cursor, err = s.client.GetConversations(params)
		if err != nil {
			return nil, err
		}
	}
	return allChannels, nil
}
