package database

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
)

// CustomDetector represents a custom detector in the database
type CustomDetector struct {
	ID          uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	Name        string         `gorm:"uniqueIndex;not null" json:"name"`
	Keywords    StringArray    `gorm:"type:text" json:"keywords"`
	Patterns    StringArray    `gorm:"type:text" json:"patterns"`
	Description string         `gorm:"type:text" json:"description"`
	CreatedAt   time.Time      `json:"createdAt"`
	UpdatedAt   time.Time      `json:"updatedAt"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"` // Soft delete
}

// TableName specifies the table name for the CustomDetector model
func (CustomDetector) TableName() string {
	return "custom_detectors"
}

// StringArray is a custom type for storing string slices in SQLite as JSON
type StringArray []string

// Value implements the driver.Valuer interface for storing in database
func (sa StringArray) Value() (driver.Value, error) {
	if sa == nil {
		return nil, nil
	}
	return json.Marshal(sa)
}

// Scan implements the sql.Scanner interface for reading from database
func (sa *StringArray) Scan(value interface{}) error {
	if value == nil {
		*sa = nil
		return nil
	}

	bytes, ok := value.([]byte)
	if !ok {
		return fmt.Errorf("failed to unmarshal StringArray value: %v", value)
	}

	return json.Unmarshal(bytes, sa)
}
