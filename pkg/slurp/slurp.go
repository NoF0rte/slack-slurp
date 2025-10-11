package slurp

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
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

var urlPattern = regexp.MustCompile(`\bhttps?:\/\/[a-zA-Z0-9.-]+(?:\.[a-zA-Z]{2,})?(?::\d{1,5})?(?:\/[^\s|]*)?(?:\?[^\s|]*)?(?:#[^\s|]*)?\b`)

// ChannelType represents the different channels in Slack
type ChannelType string

const (
	ChannelPublic        ChannelType = "public_channel"
	ChannelPrivate       ChannelType = "private_channel"
	ChannelDirectMessage ChannelType = "im"
	ChannelGroupMessage  ChannelType = "mpim"
)

type Message struct {
	User    string              `json:"user"`
	Date    time.Time           `json:"date"`
	Channel string              `json:"channel"`
	Text    string              `json:"text"`
	Raw     slack.SearchMessage `json:"-"`
}

func (m Message) ToJson() (string, error) {
	bytes, err := json.MarshalIndent(&m, "", "  ")
	if err != nil {
		return "", err
	}

	return string(bytes), nil
}

type File struct {
	Name     string     `json:"name"`
	Created  time.Time  `json:"created"`
	Channels []string   `json:"channels"`
	URL      string     `json:"url"`
	Filetype string     `json:"filetype"`
	User     string     `json:"user"`
	Size     int        `json:"size"`
	Raw      slack.File `json:"-"`
}

type Team struct {
	Name  string `json:"name"`
	Image string `json:"image"`
}

type Channel struct {
	ID               string         `json:"id"`
	Name             string         `json:"name"`
	Topic            string         `json:"topic"`
	IsChannel        bool           `json:"is_channel"`
	IsArchived       bool           `json:"is_archived"`
	IsPrivate        bool           `json:"is_private"`
	IsDM             bool           `json:"is_im"`
	IsGroupMessage   bool           `json:"is_mpim"`
	IsExternal       bool           `json:"is_external"`
	NumMembers       int            `json:"num_members"`
	Created          slack.JSONTime `json:"created"`
	Latest           slack.JSONTime `json:"latest"`
	SharedTeams      []Team         `json:"shared_teams"`
	ConnectedTeamIDs []string       `json:"connected_team_ids"`
	InternalTeamIDs  []string       `json:"internal_team_ids"`
}

type User struct {
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	FullName      string `json:"real_name"`
	Email         string `json:"email"`
	Username      string `json:"name"`
	Image         string `json:"image"`
	Phone         string `json:"phone"`
	Title         string `json:"title"`
	IsAdmin       bool   `json:"is_admin"`
	IsBot         bool   `json:"is_bot"`
	IsOwner       bool   `json:"is_owner"`
	Has2FA        bool   `json:"has_2fa"`
	TwoFactorType string `json:"two_factor_type"`
	Deleted       bool   `json:"deleted"`
}

type Secret struct {
	// Raw contains the raw secret identifier data.
	Raw      string `json:"raw"`
	Verified bool   `json:"verified"`
}

type SecretResult struct {
	Type    string   `json:"type"`
	Message Message  `json:"message"`
	Secrets []Secret `json:"secrets"`
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

type SearchOption func(query string) string

func SearchBefore(date time.Time) SearchOption {
	return func(query string) string {
		return fmt.Sprintf("%s before:%s", query, date.Format("2006-01-02"))
	}
}

func SearchAfter(date time.Time) SearchOption {
	return func(query string) string {
		return fmt.Sprintf("%s after:%s", query, date.Format("2006-01-02"))
	}
}

func SearchInChannels(channels ...string) SearchOption {
	return func(query string) string {
		for _, channel := range channels {
			query = fmt.Sprintf("%s in:#%s", query, channel)
		}
		return query
	}
}

func SearchFromUsers(users ...string) SearchOption {
	return func(query string) string {
		for _, user := range users {
			query = fmt.Sprintf("%s in:@%s", query, user)
		}
		return query
	}
}

func SearchFileTypes(types ...string) SearchOption {
	return func(query string) string {
		for _, t := range types {
			query = fmt.Sprintf("%s type:%s", query, t)
		}
		return query
	}
}

type SecretOptions struct {
	searchOptions []SearchOption
	detectors     []detectors.Detector
	verify        bool
}

type SecretOption func(opts *SecretOptions)

func SecretsInChannel(channels ...string) SecretOption {
	return func(opts *SecretOptions) {
		opts.searchOptions = append(opts.searchOptions, SearchInChannels(channels...))
	}
}

func SecretsDetectors(detectrs ...detectors.Detector) SecretOption {
	return func(opts *SecretOptions) {
		opts.detectors = detectrs
	}
}

func SecretsVerify(verify bool) SecretOption {
	return func(opts *SecretOptions) {
		opts.verify = verify
	}
}

type Slurper struct {
	client    *slack.Client
	config    *Config
	detectors []detectors.Detector
}

func newSlackHTTPClient(dCookie string, dsCookie string) *http.Client {
	jar, _ := cookiejar.New(nil)
	url, _ := url.Parse("https://slack.com")
	jar.SetCookies(url, []*http.Cookie{
		{
			Name:   "d",
			Value:  dCookie,
			Path:   "/",
			Domain: "slack.com",
		},
	})

	if dsCookie != "" {
		jar.SetCookies(url, []*http.Cookie{
			{
				Name:   "d-s",
				Value:  dsCookie,
				Path:   "/",
				Domain: "slack.com",
			},
		})
	}

	return &http.Client{
		Jar: jar,
	}
}

// New returns a new Slurper instance
func New(cfg *Config) Slurper {
	client := newSlackHTTPClient(cfg.DCookie, cfg.DSCookie)
	return Slurper{
		client:    slack.New(cfg.APIToken, slack.OptionHTTPClient(client)),
		config:    cfg,
		detectors: cfg.GetDetectors(),
	}
}

// AuthTest executes the auth.test API method which simply tests the current credentials
func (s Slurper) AuthTest() (*slack.AuthTestResponse, error) {
	resp, err := s.client.AuthTest()
	if err != nil {
		return nil, err
	}

	return resp, nil
}

func (s *Slurper) UpdateCreds(apiToken string, dCookie string, dsCookie string) {
	s.config.APIToken = apiToken
	s.config.DCookie = dCookie
	s.config.DSCookie = dsCookie

	client := newSlackHTTPClient(dCookie, dsCookie)
	s.client = slack.New(apiToken, slack.OptionHTTPClient(client))
}

// SearchMessages will search Slack messages for the specified query. Will return only once all matched messages have been retrieved.
// Slack's query syntax can be used here.
func (s Slurper) SearchMessages(query string, options ...SearchOption) ([]Message, error) {
	var err error
	var messages []Message

	messageChan, errorChan := s.SearchMessagesAsync(query, options...)

Loop:
	for {
		select {
		case message, ok := <-messageChan:
			if !ok {
				break Loop
			}
			messages = append(messages, message)
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	return messages, err
}

func (s Slurper) handleRateLimit(err error) bool {
	if err == nil {
		return false
	}

	if rateLimitErr, ok := err.(*slack.RateLimitedError); ok {
		time.Sleep(rateLimitErr.RetryAfter)
		return true
	}

	return false
}

func (s Slurper) getPageCount(query string, searchType string) (int, error) {
	var paging slack.Paging
	params := slack.NewSearchParameters()

	if searchType == "messages" {
		search, err := s.searchMessages(query, params)
		if err != nil {
			return 0, err
		}

		paging = search.Paging
	} else if searchType == "files" {
		search, err := s.searchFiles(query, params)
		if err != nil {
			return 0, err
		}

		paging = search.Paging
	}

	return paging.Pages, nil
}

func (s Slurper) searchMessages(query string, params slack.SearchParameters) (*slack.SearchMessages, error) {
	for {
		search, err := s.client.SearchMessages(query, params)
		if s.handleRateLimit(err) {
			continue
		}

		return search, err
	}
}

// SearchMessagesAsync will search Slack messages for the specified query asynchronously using channels.
// Slack's query syntax can be used here.
func (s Slurper) SearchMessagesAsync(query string, options ...SearchOption) (chan Message, chan error) {
	return s.SearchMessagesAsyncWithContext(context.Background(), query, options...)
}

// SearchMessagesAsyncWithContext will search Slack messages for the specified query asynchronously using channels.
// Slack's query syntax can be used here.
func (s Slurper) SearchMessagesAsyncWithContext(ctx context.Context, query string, options ...SearchOption) (chan Message, chan error) {
	messageChan := make(chan Message)
	errorChan := make(chan error, 1) // Buffered to prevent blocking

	if len(options) != 0 {
		for _, option := range options {
			query = option(query)
		}
	}

	go func() {
		defer close(messageChan)

		var wg sync.WaitGroup
		var mu sync.Mutex
		var hasError bool

		var current int
		count, err := s.getPageCount(query, "messages")
		if err != nil {
			select {
			case errorChan <- err:
			case <-ctx.Done():
			}
			return
		}

		sendErr := func(err error) {
			mu.Lock()
			if !hasError {
				hasError = true
				select {
				case errorChan <- err:
				default:
				}
			}
			mu.Unlock()
		}

		action := func(startingPage int) {
			defer wg.Done()
			params := slack.NewSearchParameters()
			params.Page = startingPage
			params.Count = 100 // Ensure we get the most results to reduce rate limiting

			for {
				// Check for cancellation before each API call
				select {
				case <-ctx.Done():
					sendErr(ctx.Err())
					return
				default:
				}

				search, err := s.searchMessages(query, params)
				if err != nil {
					sendErr(err)
					return
				}

				for _, match := range search.Matches {
					// Check for cancellation before processing each message
					select {
					case <-ctx.Done():
						sendErr(ctx.Err())
						return
					default:
					}

					seconds, _ := strconv.ParseInt(strings.Split(match.Timestamp, ".")[0], 10, 64)
					date := time.Unix(seconds, 0)

					channel := match.Channel.Name
					if match.Channel.IsPrivate { // IsPrivate appears to refer to DMs?
						users, err2 := s.getUsersInfo(channel)
						if err2 == nil && users != nil {
							u := (*users)[0]

							channel = u.Name
							if u.RealName != "" {
								channel = u.RealName
							}
						}
					}

					// Non-blocking send
					select {
					case messageChan <- Message{
						User:    match.Username,
						Date:    date,
						Channel: channel,
						Text:    match.Text,
						Raw:     match,
					}:
					case <-ctx.Done():
						sendErr(ctx.Err())
						return
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
	}()

	return messageChan, errorChan
}

func (s Slurper) searchFiles(query string, params slack.SearchParameters) (*slack.SearchFiles, error) {
	for {
		search, err := s.client.SearchFiles(query, params)
		if s.handleRateLimit(err) {
			continue
		}

		return search, err
	}
}

// SearchFiles will search Slack files for the specified query. Will return only once all matched files have been retrieved.
// Slack's query syntax can be used here.
func (s Slurper) SearchFiles(query string, options ...SearchOption) ([]File, error) {
	var err error
	var files []File

	fileChan, errorChan := s.SearchFilesAsync(query, options...)

Loop:
	for {
		select {
		case file, ok := <-fileChan:
			if !ok {
				break Loop
			}
			files = append(files, file)
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	return files, err
}

// SearchFilesAsync will search Slack files for the specified query asynchronously using channels.
// Slack's query syntax can be used here.
func (s Slurper) SearchFilesAsync(query string, options ...SearchOption) (chan File, chan error) {
	return s.SearchFilesAsyncWithContext(context.Background(), query, options...)
}

// SearchFilesAsyncWithContext will search Slack files for the specified query asynchronously using channels.
// Slack's query syntax can be used here.
func (s Slurper) SearchFilesAsyncWithContext(ctx context.Context, query string, options ...SearchOption) (chan File, chan error) {
	fileChan := make(chan File)
	errorChan := make(chan error, 1)

	if len(options) != 0 {
		for _, option := range options {
			query = option(query)
		}
	}

	go func() {
		defer close(fileChan)

		var wg sync.WaitGroup
		var mu sync.Mutex
		var hasError bool

		var current int
		count, err := s.getPageCount(query, "files")
		if err != nil {
			select {
			case errorChan <- err:
			case <-ctx.Done():
			}
			return
		}

		sendErr := func(err error) {
			mu.Lock()
			if !hasError {
				hasError = true
				select {
				case errorChan <- err:
				default:
				}
			}
			mu.Unlock()
		}

		action := func(startingPage int) {
			defer wg.Done()
			params := slack.NewSearchParameters()
			params.Page = startingPage
			params.Count = 100

			for {
				// Check for cancellation before each API call
				select {
				case <-ctx.Done():
					sendErr(ctx.Err())
					return
				default:
				}

				search, err := s.searchFiles(query, params)
				if err != nil {
					errorChan <- err
					return
				}

				for _, match := range search.Matches {
					// Check for cancellation before processing each message
					select {
					case <-ctx.Done():
						sendErr(ctx.Err())
						return
					default:
					}

					resolveID := func(channel string) string {
						shareInfo, ok := match.Shares.Public[channel]
						if ok && len(shareInfo) > 0 {
							return shareInfo[0].ChannelName
						}

						shareInfo, ok = match.Shares.Private[channel]
						if ok && len(shareInfo) > 0 {
							return shareInfo[0].ChannelName
						}

						return channel
					}

					var channels []string
					for _, channel := range match.Channels {
						channels = append(channels, resolveID(channel))
					}

					for _, group := range match.Groups {
						channels = append(channels, resolveID(group))
					}

					url := match.URLPrivateDownload
					if url == "" {
						url = match.URLPrivate
					}

					user := match.User
					users, err2 := s.getUsersInfo(match.User)
					if err2 == nil && users != nil {
						u := (*users)[0]

						user = u.Name
						if u.RealName != "" {
							user = u.RealName
						}
					}

					select {
					case fileChan <- File{
						Name:     match.Name,
						Created:  match.Created.Time(),
						Channels: channels,
						URL:      url,
						Filetype: match.Filetype,
						Size:     match.Size,
						User:     user,
						Raw:      match,
					}:
					case <-ctx.Done():
						sendErr(ctx.Err())
						return
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
	}()

	return fileChan, errorChan
}

func (s Slurper) getUsers() ([]slack.User, error) {
	for {
		slackUsers, err := s.client.GetUsers()
		if s.handleRateLimit(err) {
			continue
		}

		return slackUsers, err
	}
}

// GetUsers returns all users in the current workspace.
func (s Slurper) GetUsers() ([]User, error) {
	slackUsers, err := s.getUsers()
	if err != nil {
		return nil, err
	}

	var users []User
	for _, user := range slackUsers {
		twoFactor := ""
		if user.TwoFactorType != nil {
			twoFactor = *user.TwoFactorType
		}

		users = append(users, User{
			FirstName:     user.Profile.FirstName,
			LastName:      user.Profile.LastName,
			FullName:      user.Profile.RealName,
			Title:         user.Profile.Title,
			Email:         user.Profile.Email,
			Image:         user.Profile.ImageOriginal,
			Phone:         user.Profile.Phone,
			Username:      user.Name,
			IsAdmin:       user.IsAdmin,
			IsBot:         user.IsBot,
			IsOwner:       user.IsOwner,
			Has2FA:        user.Has2FA,
			TwoFactorType: twoFactor,
			Deleted:       user.Deleted,
		})
	}
	return users, nil
}

// GetSecrets searches Slack messages for secrets using trufflehog detectors. Will return only once all secrets have been retrieved.
func (s Slurper) GetSecrets(opts ...SecretOption) ([]SecretResult, error) {

	var err error
	var allSecrets []SecretResult

	secretChan, errorChan := s.GetSecretsAsync(opts...)

Loop:
	for {
		select {
		case secret, ok := <-secretChan:
			if !ok {
				break Loop
			}
			allSecrets = append(allSecrets, secret)
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	return allSecrets, err
}

// GetSecretsAsync searches Slack messages for secrets using trufflehog detectors asynchronously.
func (s Slurper) GetSecretsAsync(opts ...SecretOption) (chan SecretResult, chan error) {
	return s.GetSecretsAsyncWithContext(context.Background(), opts...)
}

// GetSecretsAsyncWithContext searches Slack messages for secrets using trufflehog detectors asynchronously.
func (s Slurper) GetSecretsAsyncWithContext(ctx context.Context, opts ...SecretOption) (chan SecretResult, chan error) {
	secretChan := make(chan SecretResult)
	errorChan := make(chan error)

	options := &SecretOptions{}
	for _, o := range opts {
		o(options)
	}

	selectedDetectors := s.detectors
	if len(options.detectors) != 0 {
		selectedDetectors = options.detectors
	}

	go func() {
		defer close(secretChan)

		nonStarSearchableRe := regexp.MustCompile(`(-|\.|_)$`)
		for _, detector := range selectedDetectors {
			// Check for cancellation before processing each detector
			select {
			case <-ctx.Done():
				errorChan <- ctx.Err()
				return
			default:
			}

			var err error
			keywords := detector.Keywords()
			for _, keyword := range keywords {
				// Check for cancellation before processing each keyword
				select {
				case <-ctx.Done():
					errorChan <- ctx.Err()
					return
				default:
				}

				if !nonStarSearchableRe.MatchString(keyword) {
					keyword = keyword + "*"
				}
				messageChan, err2Chan := s.SearchMessagesAsync(keyword, options.searchOptions...)

			Loop:
				for {
					select {
					case <-ctx.Done():
						errorChan <- ctx.Err()
						return
					case message, ok := <-messageChan:
						if !ok {
							break Loop
						}

						results, err := detector.FromData(context.Background(), options.verify, []byte(message.Text))
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

						// Non-blocking send
						select {
						case secretChan <- SecretResult{
							Message: message,
							Type:    typeString,
							Secrets: secrets,
						}:
						case <-ctx.Done():
							errorChan <- ctx.Err()
							return
						}
					case err = <-err2Chan:
						break Loop
					}
				}
				close(err2Chan)

				if err != nil {
					errorChan <- err
					return
				}
			}
		}
	}()

	return secretChan, errorChan
}

// GetDomains searches Slack for domains and subdomains. Will return only once all domains have been retrieved.
func (s Slurper) GetDomains(domains []string, options ...SearchOption) ([]string, error) {
	domainChan, errorChan := s.GetDomainsAsync(domains, options...)

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
func (s Slurper) GetDomainsAsync(domains []string, options ...SearchOption) (chan string, chan error) {
	return s.GetDomainsAsyncWithContext(context.Background(), domains, options...)
}

// GetDomainsAsyncWithContext searches Slack for domains and subdomains asynchronously.
func (s Slurper) GetDomainsAsyncWithContext(ctx context.Context, domains []string, options ...SearchOption) (chan string, chan error) {
	domainChan := make(chan string)
	errorChan := make(chan error)

	selectedDomains := s.config.Domains
	if len(domains) != 0 {
		selectedDomains = domains
	}

	go func() {
		defer close(domainChan)

		domainSet := treeset.NewWithStringComparator()
		for _, domain := range selectedDomains {
			// Check for cancellation before processing each domain
			select {
			case <-ctx.Done():
				errorChan <- ctx.Err()
				return
			default:
			}

			var err error
			regex := regexp.MustCompile(fmt.Sprintf(`%%?([0-9a-zA-Z\-\.\*]+)?%s`, regexp.QuoteMeta(domain)))
			messageChan, err2Chan := s.SearchMessagesAsyncWithContext(ctx, domain, options...)

		Loop:
			for {
				select {
				case <-ctx.Done():
					errorChan <- ctx.Err()
					return
				case message, ok := <-messageChan:
					if !ok {
						break Loop
					}
					matches := regex.FindAllString(message.Text, -1)

					for _, match := range matches {
						// This is so that for the off chance that the match is found in an URL
						// we will take out the URL encoded character and only match the domain
						// This isn't perfect because something like %AFexample.com where the domain is actually
						// AFexample.com will only match example.com
						if strings.HasPrefix(match, "%") {
							decoded, err := url.QueryUnescape(match)
							if err == nil {
								m := regex.FindString(decoded)
								if m != "" {
									match = m
								}
							}

							match = strings.TrimPrefix(match, "%")
						}

						if domainSet.Contains(match) {
							continue
						}

						domainSet.Add(match)

						// Non-blocking send
						select {
						case domainChan <- match:
						case <-ctx.Done():
							errorChan <- ctx.Err()
							return
						}
					}
				case err = <-err2Chan:
					break Loop
				}
			}
			close(err2Chan)

			if err != nil {
				errorChan <- err
				return
			}
		}
	}()

	return domainChan, errorChan
}

// GetURLs searches Slack URLs. Will return only once all URLs have been retrieved.
func (s Slurper) GetURLs(options ...SearchOption) ([]string, error) {
	urlChan, errorChan := s.GetURLsAsync(options...)

	var err error
	var allURLs []string

Loop:
	for {
		select {
		case u, ok := <-urlChan:
			if !ok {
				break Loop
			}
			allURLs = append(allURLs, u)
		case err = <-errorChan:
			close(urlChan)
		}
	}
	close(errorChan)

	return allURLs, err
}

func (s Slurper) GetURLsAsync(options ...SearchOption) (chan string, chan error) {
	return s.GetURLsAsyncWithContext(context.Background(), options...)
}

func (s Slurper) GetURLsAsyncWithContext(ctx context.Context, options ...SearchOption) (chan string, chan error) {
	urlChan := make(chan string)
	errorChan := make(chan error)

	keywords := []string{"http://", "https://"}
	go func() {
		defer close(urlChan)

		urlSet := treeset.NewWithStringComparator()
		for _, keyword := range keywords {
			// Check for cancellation before processing each keyword
			select {
			case <-ctx.Done():
				errorChan <- ctx.Err()
				return
			default:
			}

			var err error
			messageChan, err2Chan := s.SearchMessagesAsyncWithContext(ctx, keyword, options...)

		Loop:
			for {
				select {
				case <-ctx.Done():
					errorChan <- ctx.Err()
					return
				case message, ok := <-messageChan:
					if !ok {
						break Loop
					}
					matches := urlPattern.FindAllString(message.Text, -1)

					for _, match := range matches {
						if urlSet.Contains(match) {
							continue
						}

						urlSet.Add(match)

						// Non-blocking send
						select {
						case urlChan <- match:
						case <-ctx.Done():
							errorChan <- ctx.Err()
							return
						}
					}
				case err = <-err2Chan:
					break Loop
				}
			}
			close(err2Chan)

			if err != nil {
				errorChan <- err
				return
			}
		}
	}()

	return urlChan, errorChan
}

func (s Slurper) getUsersInfo(users ...string) (*[]slack.User, error) {
	for {
		users, err := s.client.GetUsersInfo(users...)
		if s.handleRateLimit(err) {
			continue
		}

		return users, err
	}
}

func (s Slurper) GetLatestMessage(channelID string) (*slack.Message, error) {
	for {
		resp, err := s.client.GetConversationHistory(&slack.GetConversationHistoryParameters{
			ChannelID: channelID,
			Limit:     1, // Only want the latest message
		})

		if s.handleRateLimit(err) {
			continue
		}

		if len(resp.Messages) == 0 {
			return nil, nil
		}

		return &resp.Messages[0], err
	}
}

func (s Slurper) GetTeamInfo(teamID string) (*slack.TeamInfo, error) {
	for {
		team, err := s.client.GetOtherTeamInfo(teamID)
		if s.handleRateLimit(err) {
			continue
		}

		return team, err
	}
}

func (s Slurper) GetChannelInfo(channelID string) (*slack.Channel, error) {
	for {
		c, err := s.client.GetConversationInfo(&slack.GetConversationInfoInput{
			ChannelID:         channelID,
			IncludeNumMembers: true,
		})

		if s.handleRateLimit(err) {
			continue
		}

		return c, err
	}
}

func (s Slurper) getChannels(params *slack.GetConversationsParameters) ([]*slack.Channel, string, error) {
	for {
		chans, cursor, err := s.client.GetConversations(params)
		if s.handleRateLimit(err) {
			continue
		}

		var channels []*slack.Channel
		dmMap := make(map[string]*slack.Channel)
		var userIds []string
		for _, c := range chans {
			cPtr := &c
			if c.IsIM {
				dmMap[c.User] = cPtr
				userIds = append(userIds, c.User)
			} else if c.IsGroup { // Apparently groups don't get the number of members populated when you call GetConversations
				updatedChan, err := s.GetChannelInfo(c.ID)
				if err == nil { // Update if no error
					cPtr.NumMembers = updatedChan.NumMembers
				}
			}

			channels = append(channels, cPtr)
		}

		if len(userIds) != 0 {
			users, err2 := s.getUsersInfo(userIds...)
			if err2 != nil {
				fmt.Println(err2)
			}

			if users != nil {
				for _, user := range *users {
					name := user.Name
					if user.RealName != "" {
						name = user.RealName
					}

					channel := dmMap[user.ID]
					channel.Name = name
				}
			}
		}

		return channels, cursor, err
	}
}

// GetChannels returns all channels in the current workspace of the specified type. If no channel type is supplied, the API defaults to returning public channels.
// Will return only once all channels have been retrieved
func (s Slurper) GetChannels(channelTypes ...ChannelType) ([]Channel, error) {
	var err error
	var channels []Channel

	channelChan, errorChan := s.GetChannelsAsync(channelTypes...)

Loop:
	for {
		select {
		case channel, ok := <-channelChan:
			if !ok {
				break Loop
			}
			channels = append(channels, channel)
		case err = <-errorChan:
			break Loop
		}
	}
	close(errorChan)

	return channels, err
}

// GetChannelsAsync returns all channels in the current workspace of the specified type asynchronously using channels. If no channel type is supplied, the API defaults to returning public channels.
func (s Slurper) GetChannelsAsync(channelTypes ...ChannelType) (chan Channel, chan error) {
	return s.GetChannelsAsyncWithContext(context.Background(), channelTypes...)
}

// GetChannelsAsyncWithContext returns all channels in the current workspace of the specified type asynchronously using channels with context support for cancellation.
func (s Slurper) GetChannelsAsyncWithContext(ctx context.Context, channelTypes ...ChannelType) (chan Channel, chan error) {
	channelChan := make(chan Channel)
	errorChan := make(chan error)

	var types []string
	for _, t := range channelTypes {
		types = append(types, string(t))
	}

	go func() {
		defer close(channelChan)

		params := &slack.GetConversationsParameters{
			Types: types,
			Limit: 999, // Get as much as we can in one request to avoid rate limiting as much as we can
		}

		for {
			// Check for cancellation before each API call
			select {
			case <-ctx.Done():
				errorChan <- ctx.Err()
				return
			default:
			}

			channels, cursor, err := s.getChannels(params)
			if err != nil {
				errorChan <- err
				return
			}

			for _, channel := range channels {
				// Check for cancellation before sending each channel
				select {
				case <-ctx.Done():
					errorChan <- ctx.Err()
					return
				case channelChan <- Channel{
					ID:               channel.ID,
					Name:             channel.Name,
					Topic:            channel.Topic.Value,
					IsChannel:        channel.IsChannel,
					IsArchived:       channel.IsArchived,
					IsPrivate:        channel.IsPrivate || channel.IsGroup,
					IsDM:             channel.IsIM,
					IsGroupMessage:   channel.IsMpIM,
					IsExternal:       channel.IsExtShared,
					NumMembers:       channel.NumMembers,
					Created:          channel.Created,
					ConnectedTeamIDs: channel.ConnectedTeamIDs,
					InternalTeamIDs:  channel.InternalTeamIDs,
				}:
				}
			}

			if cursor == "" {
				break
			}

			params.Cursor = cursor
		}
	}()

	return channelChan, errorChan
}

func (s Slurper) DownloadFile(fileID string, w io.Writer) (string, error) {
	file, _, _, err := s.client.GetFileInfo(fileID, 1, 1)
	if err != nil {
		return "", err
	}

	err = s.client.GetFile(file.URLPrivateDownload, w)
	if err != nil {
		return "", err
	}

	return file.Name, nil
}
