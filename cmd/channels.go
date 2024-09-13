package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/emirpasic/gods/sets/treeset"
	"github.com/spf13/cobra"
)

var allChannelTypes = []string{
	"direct",
	"group",
	"private",
	"public",
}

// channelsCmd represents the channels command
var channelsCmd = &cobra.Command{
	Use:   "channels",
	Short: "Returns channels accessible to the current user. This can include public/private channels and group/direct messages",
	RunE: func(cmd *cobra.Command, args []string) error {
		output, _ := cmd.Flags().GetString("output")

		file, err := os.Create(output)
		if err != nil {
			return err
		}

		defer file.Close()

		typeSet := treeset.NewWithStringComparator()

		types, _ := cmd.Flags().GetStringSlice("types")
		for _, t1 := range types {
			t1 = strings.ToLower(t1)

			for _, t2 := range strings.Split(t1, ",") {
				typeSet.Add(strings.TrimSpace(t2))
			}
		}

		var channelTypes []slurp.ChannelType
		for _, t := range typeSet.Values() {
			switch t.(string) {
			case "direct":
				channelTypes = append(channelTypes, slurp.ChannelDirectMessage)
			case "group":
				channelTypes = append(channelTypes, slurp.ChannelGroupMessage)
			case "private":
				channelTypes = append(channelTypes, slurp.ChannelPrivate)
			case "public":
				channelTypes = append(channelTypes, slurp.ChannelPublic)
			default:
				return fmt.Errorf("%s is not a valid channel type", t)
			}
		}

		fmt.Println("[+] Slurping Channels...")

		channelChan, errorChan := slurper.GetChannelsAsync(channelTypes...)

		var channelErr error
		var channels []slurp.Channel

	Loop:
		for {
			select {
			case channel, ok := <-channelChan:
				if !ok {
					break Loop
				}
				channels = append(channels, channel)

				bytes, _ := json.MarshalIndent(channel, "", "  ")
				fmt.Println(string(bytes))
			case channelErr = <-errorChan:
				close(channelChan)
			}
		}
		close(errorChan)

		if len(channels) > 0 {
			fmt.Printf("[+] Writing to %s\n", output)

			bytes, err := json.MarshalIndent(channels, "", "  ")
			if err != nil {
				return err
			}

			fmt.Fprintln(file, string(bytes))
		}

		if channelErr != nil {
			return channelErr
		}

		return nil
	},
}

func init() {
	rootCmd.AddCommand(channelsCmd)

	channelsCmd.Flags().StringSliceP("types", "T", allChannelTypes, "The types of channels to get. A comma separated list and/or multiple -T flags are accepted.")
	channelsCmd.Flags().StringP("output", "o", "slurp-channels.json", "File to write the output to.")
}
