package slurp

import (
	"context"
	"regexp"

	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
	"github.com/trufflesecurity/trufflehog/v3/pkg/pb/detectorspb"
)

const detectorType_Custom detectorspb.DetectorType = 5000

type CustomDetector struct {
	Name      string   `mapstructure:"name"`
	Keywordss []string `mapstructure:"keywords"`
	Patterns  []string `mapstructure:"patterns"`
}

func (d *CustomDetector) Keywords() []string {
	return d.Keywordss
}

func (d *CustomDetector) FromData(ctx context.Context, verify bool, data []byte) ([]detectors.Result, error) {
	dataStr := string(data)

	var results []detectors.Result
	for _, pattern := range d.Patterns {
		regex := regexp.MustCompile(pattern)
		matches := regex.FindAllStringSubmatch(dataStr, -1)

		subExpNum := regex.NumSubexp()
		for _, match := range matches {
			if subExpNum == 0 {
				results = append(results, detectors.Result{
					DetectorType: detectorType_Custom,
					Verified:     false,
					Raw:          []byte(match[0]),
				})
				continue
			}

			for i := 1; i <= subExpNum; i++ {
				results = append(results, detectors.Result{
					DetectorType: detectorType_Custom,
					Verified:     false,
					Raw:          []byte(match[i]),
				})
			}
		}
	}

	return results, nil
}
