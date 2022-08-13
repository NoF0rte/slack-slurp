package util

import (
	"encoding/json"
	"os"
	"strings"
)

func WriteJson(path string, v interface{}) error {
	data, err := json.MarshalIndent(v, "", "  ")
	if err != nil {
		return err
	}

	return os.WriteFile(path, data, 0644)
}

func WriteLines(path string, lines []string) error {
	data := strings.Join(lines, "\n")
	return os.WriteFile(path, []byte(data), 0644)
}
