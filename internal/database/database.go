package database

import (
	"fmt"
	"os"
	"path/filepath"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DB is the global database connection
var DB *gorm.DB

// InitDB initializes the SQLite database connection
func InitDB() error {
	// Determine database path
	// Use current directory or home directory
	var dbPath string

	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("failed to get home directory: %w", err)
	}

	// Create .slack-slurp directory in home if it doesn't exist
	dbDir := filepath.Join(home, ".slack-slurp")
	if err := os.MkdirAll(dbDir, 0755); err != nil {
		return fmt.Errorf("failed to create database directory: %w", err)
	}

	dbPath = filepath.Join(dbDir, "slack-slurp.db")

	// Open database connection
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		return fmt.Errorf("failed to connect to database: %w", err)
	}

	DB = db

	// Run migrations
	if err := Migrate(); err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	return nil
}

// Migrate runs database migrations
func Migrate() error {
	if DB == nil {
		return fmt.Errorf("database connection not initialized")
	}

	// Auto-migrate all models
	if err := DB.AutoMigrate(&CustomDetector{}, &Profile{}, &GlobalSettings{}); err != nil {
		return fmt.Errorf("failed to run auto-migration: %w", err)
	}
	
	// Initialize default global settings if they don't exist
	settingsRepo := NewGlobalSettingsRepository(DB)
	_, err := settingsRepo.GetSettings()
	if err != nil {
		return fmt.Errorf("failed to initialize global settings: %w", err)
	}

	return nil
}

// Close closes the database connection
func Close() error {
	if DB == nil {
		return nil
	}

	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}

	return sqlDB.Close()
}
