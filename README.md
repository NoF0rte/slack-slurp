# Slack-Slurp
What is slack-slurp? Slack-slurp is a pentesting social post-exploitation tool for slack. It uses Slack's API to search through messages and [trufflehog's](https://github.com/trufflesecurity/trufflehog) secrets detectors to slurp up any juicy information. If you are truly interested in using this and would like more documentation, let me know. I will try to write more detailed documentation as soon as I can and letting me know could potentially speed up the process.

## Usage
TODO: Add usage
### Default Config
```yaml
detectors:
    - auth0managementapitoken
    - aws
    - azure
    - censys
    - cloudflareapitoken
    - cloudflarecakey
    - digitaloceantoken
    - discordbottoken
    - discordwebhook
    - dropbox
    - gcp
    - generic
    - github
    - github_old
    - githubapp
    - gitlab
    - gitlabv2
    - heroku
    - jiratoken
    - microsoftteamswebhook
    - okta
    - pastebin
    - privatekey
    - shodankey
    - slack
    - slackwebhook
    - terraformcloudpersonaltoken
    - uri
    - urlscan
domains: []
slack-cookie: ""
slack-token: ""
```