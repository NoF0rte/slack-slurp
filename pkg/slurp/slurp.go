package slurp

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/emirpasic/gods/sets/treeset"
	"github.com/slack-go/slack"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
)

// ChannelType represents the different channels in Slack
type ChannelType string

const (
	ChannelPublic        ChannelType = "public_channel"
	ChannelPrivate       ChannelType = "private_channel"
	ChannelDirectMessage ChannelType = "im"
	ChannelGroupMessage  ChannelType = "mpim"
)

type Message struct {
	User    string
	Date    time.Time
	Channel string
	Text    string
}

func (m Message) ToJson() (string, error) {
	bytes, err := json.MarshalIndent(&m, "", "  ")
	if err != nil {
		return "", err
	}

	return string(bytes), nil
}

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
	Message Message
	Secrets []Secret
}

// Verified returns a new SecretResult containing only the verified secrets
func (s SecretResult) Verified() SecretResult {
	var verified []Secret
	for _, secret := range s.Secrets {
		if secret.Verified {
			verified = append(verified, secret)
		}
	}

	return SecretResult{
		Type:    s.Type,
		Message: s.Message,
		Secrets: verified,
	}
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

// New returns a new Slurper instance
func New(cfg *Config) Slurper {
	jar, _ := cookiejar.New(nil)
	url, _ := url.Parse("https://slack.com")
	jar.SetCookies(url, []*http.Cookie{
		{
			Name:   "d",
			Value:  cfg.DCookie,
			Path:   "/",
			Domain: "slack.com",
		},
	})

	if cfg.DSCookie != "" {
		jar.SetCookies(url, []*http.Cookie{
			{
				Name:   "d-s",
				Value:  cfg.DSCookie,
				Path:   "/",
				Domain: "slack.com",
			},
		})
	}

	client := &http.Client{
		Jar: jar,
	}

	return Slurper{
		client:    slack.New(cfg.APIToken, slack.OptionHTTPClient(client)),
		config:    cfg,
		detectors: cfg.getDetectors(),
	}
}

// AuthTest executes the auth.test API method which simply tests the current credentials
func (s Slurper) AuthTest() (string, error) {
	resp, err := s.client.AuthTest()
	if err != nil {
		return "", err
	}

	return resp.User, nil
}

// SearchMessages will search Slack messages for the specified query. Will return only once all matched messages have been retrieved.
// Slack's query syntax can be used here.
func (s Slurper) SearchMessages(query string) ([]Message, error) {
	var err error
	var messages []Message

	messageChan, errorChan := s.SearchMessagesAsync(query)

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

func (s Slurper) getPageCount(query string) (int, error) {
	params := slack.NewSearchParameters()
	search, err := s.client.SearchMessages(query, params)
	if err != nil {
		return 0, err
	}

	return search.Paging.Pages, nil
}

// SearchMessagesAsync will search Slack messages for the specified query asynchronously using channels.
// Slack's query syntax can be used here.
func (s Slurper) SearchMessagesAsync(query string) (chan Message, chan error) {
	messageChan := make(chan Message)
	errorChan := make(chan error)

	go func() {
		var wg sync.WaitGroup
		var mu sync.Mutex

		var current int
		count, err := s.getPageCount(query)
		if err != nil {
			errorChan <- err
			return
		}

		action := func(startingPage int) {
			defer wg.Done()
			params := slack.NewSearchParameters()
			params.Page = startingPage

			for {
				search, err := s.client.SearchMessages(query, params)
				if err != nil {
					errorChan <- err
					return
				}

				for _, match := range search.Matches {
					seconds, _ := strconv.ParseInt(strings.Split(match.Timestamp, ".")[0], 10, 64)
					date := time.Unix(seconds, 0)

					messageChan <- Message{
						User:    match.Username,
						Date:    date,
						Channel: match.Channel.Name,
						Text:    match.Text,
					}
				}

				mu.Lock()
				if current > count {
					mu.Unlock()
					break
				}

				current++
				if current > count {
					mu.Unlock()
					break
				}
				params.Page = current

				mu.Unlock()
			}
		}

		for i := 1; i <= s.config.Threads; i++ {
			// If thread count is greater than page count, go with page count
			if current > count {
				break
			}

			current = i

			wg.Add(1)
			go action(current)
		}

		wg.Wait()

		close(messageChan)
	}()

	return messageChan, errorChan
}

// SearchFiles will search Slack files for the specified query. Will return only once all matched files have been retrieved.
// Slack's query syntax can be used here.
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

// GetUsers returns all users in the current workspace.
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

// GetSecrets searches Slack messages for secrets using trufflehog detectors. Will return only once all secrets have been retrieved.
func (s Slurper) GetSecrets(verify bool, detectrs ...detectors.Detector) ([]SecretResult, error) {
	var err error
	var allSecrets []SecretResult

	secretChan, errorChan := s.GetSecretsAsync(verify, detectrs...)

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

// GetSecretsAsync searches Slack messages for secrets using trufflehog detectors asynchronously.
func (s Slurper) GetSecretsAsync(verify bool, detectrs ...detectors.Detector) (chan SecretResult, chan error) {
	secretChan := make(chan SecretResult)
	errorChan := make(chan error)

	selectedDetectors := s.detectors
	if len(detectrs) != 0 {
		selectedDetectors = detectrs
	}

	go func() {
		nonStarSearchableRe := regexp.MustCompile(`(-|\.|_)$`)
		for _, detector := range selectedDetectors {
			var err error
			keywords := detector.Keywords()
			for _, keyword := range keywords {
				if !nonStarSearchableRe.MatchString(keyword) {
					keyword = keyword + "*"
				}
				messageChan, err2Chan := s.SearchMessagesAsync(keyword)

			Loop:
				for {
					select {
					case message, ok := <-messageChan:
						if !ok {
							break Loop
						}

						results, err := detector.FromData(context.Background(), verify, []byte(message.Text))
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

						typeString := ""
						detectorType := results[0].DetectorType
						if detectorType == detectorType_Custom {
							typeString = detector.(*CustomDetector).Name
						} else {
							typeString = detectorType.String()
						}

						secretChan <- SecretResult{
							Message: message,
							Type:    typeString,
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

// GetDomains searches Slack for domains and subdomains. Will return only once all domains have been retrieved.
func (s Slurper) GetDomains(domains ...string) ([]string, error) {
	domainChan, errorChan := s.GetDomainsAsync(domains...)

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

// GetDomainsAsync searches Slack for domains and subdomains asynchronously.
func (s Slurper) GetDomainsAsync(domains ...string) (chan string, chan error) {
	domainChan := make(chan string)
	errorChan := make(chan error)

	selectedDomains := s.config.Domains
	if len(domains) != 0 {
		selectedDomains = domains
	}

	go func() {
		domainSet := treeset.NewWithStringComparator()
		for _, domain := range selectedDomains {
			var err error
			regex := regexp.MustCompile(fmt.Sprintf(`([0-9a-zA-Z\-\.\*]+)?%s`, regexp.QuoteMeta(domain)))
			messageChan, err2Chan := s.SearchMessagesAsync(domain)

		Loop:
			for {
				select {
				case message, ok := <-messageChan:
					if !ok {
						break Loop
					}
					matches := regex.FindAllString(message.Text, -1)

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

// GetChannels returns all channels in the current workspace of the specified type. If no channel type is supplied, the API defaults to returning public channels.
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
