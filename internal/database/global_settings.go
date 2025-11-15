package database

import (
	"gorm.io/gorm"
)

// GlobalSettings represents global application settings
type GlobalSettings struct {
	ID                    uint   `gorm:"primaryKey" json:"id"`
	ConcurrentGoroutines int    `gorm:"default:10" json:"concurrentGoroutines"`
	CreatedAt             string `json:"createdAt"`
	UpdatedAt             string `json:"updatedAt"`
}

// TableName specifies the table name for GlobalSettings
func (GlobalSettings) TableName() string {
	return "global_settings"
}

// GlobalSettingsRepository handles database operations for global settings
type GlobalSettingsRepository struct {
	db *gorm.DB
}

// NewGlobalSettingsRepository creates a new global settings repository
func NewGlobalSettingsRepository(db *gorm.DB) *GlobalSettingsRepository {
	return &GlobalSettingsRepository{db: db}
}

// GetSettings retrieves the global settings, creating default if not exists
func (r *GlobalSettingsRepository) GetSettings() (*GlobalSettings, error) {
	var settings GlobalSettings
	
	// Try to get existing settings
	result := r.db.First(&settings)
	if result.Error == gorm.ErrRecordNotFound {
		// Create default settings
		settings = GlobalSettings{
			ConcurrentGoroutines: 10,
		}
		if err := r.db.Create(&settings).Error; err != nil {
			return nil, err
		}
		return &settings, nil
	}
	
	if result.Error != nil {
		return nil, result.Error
	}
	
	return &settings, nil
}

// UpdateSettings updates the global settings
func (r *GlobalSettingsRepository) UpdateSettings(settings *GlobalSettings) error {
	// Ensure we only have one settings record
	var existing GlobalSettings
	if err := r.db.First(&existing).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			// Create if doesn't exist
			return r.db.Create(settings).Error
		}
		return err
	}
	
	// Update existing
	settings.ID = existing.ID
	return r.db.Save(settings).Error
}

// UpdateConcurrentGoroutines updates only the concurrent goroutines setting
func (r *GlobalSettingsRepository) UpdateConcurrentGoroutines(count int) error {
	settings, err := r.GetSettings()
	if err != nil {
		return err
	}
	
	settings.ConcurrentGoroutines = count
	return r.UpdateSettings(settings)
}
