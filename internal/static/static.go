package static

import (
	"embed"
)

//go:embed index.html assets/*
var FS embed.FS
