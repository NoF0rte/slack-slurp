package api

import (
	"strings"

	"github.com/NoF0rte/slack-slurp/internal/database"
	"github.com/NoF0rte/slack-slurp/pkg/slurp"
	"github.com/trufflesecurity/trufflehog/v3/pkg/detectors"
)

type DBContext struct {
	profiles       *database.ProfileRepository
	detectors      *database.DetectorRepository
	globalSettings *database.GlobalSettingsRepository
}

func (c DBContext) GetCreds() (string, string, string) {
	profiles, _ := c.profiles.List()
	for _, profile := range profiles {
		if profile.IsSelected {
			return profile.APIToken, profile.DCookie, profile.DSCookie
		}
	}
	return "", "", ""
}

func (c DBContext) Threadss() int {
	if c.globalSettings == nil {
		return 10 // Default fallback
	}
	settings, err := c.globalSettings.GetSettings()
	if err != nil || settings == nil {
		return 10 // Default fallback
	}
	return settings.ConcurrentGoroutines
}

func (c DBContext) GetDetectors(detectrs ...string) []detectors.Detector {
	var selectedDetectors []detectors.Detector

	customDetectors, _ := c.detectors.List()
	if len(detectrs) == 0 { // This should mean we should use all builtin and custom detectors
		for _, detector := range slurp.BuiltInDetectors {
			selectedDetectors = append(selectedDetectors, detector)
		}

		for _, detector := range customDetectors {
			selectedDetectors = append(selectedDetectors, &slurp.CustomDetector{
				Name:      detector.Name,
				Keywordss: detector.Keywords,
				Patterns:  detector.Patterns,
				Desc:      detector.Description,
			})
		}

		return selectedDetectors
	}

	for _, t := range detectrs {
		detector, ok := slurp.BuiltInDetectors[t]
		if !ok && len(customDetectors) != 0 {
			for _, d := range customDetectors {
				if strings.EqualFold(d.Name, t) {
					detector = &slurp.CustomDetector{
						Name:      d.Name,
						Keywordss: d.Keywords,
						Patterns:  d.Patterns,
						Desc:      d.Description,
					}
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
