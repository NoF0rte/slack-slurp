package database

import (
	"time"
)

// Profile represents a set of Slack credentials
type Profile struct {
	ID         uint      `gorm:"primaryKey;autoIncrement" json:"id"`
	Name       string    `gorm:"uniqueIndex;not null" json:"name"`
	APIToken   string    `gorm:"type:text" json:"apiToken"`
	DCookie    string    `gorm:"type:text" json:"dCookie"`
	DSCookie   string    `gorm:"type:text" json:"dsCookie"`
	IsSelected bool      `gorm:"type:bool" json:"isSelected"`
	CreatedAt  time.Time `json:"createdAt"`
	UpdatedAt  time.Time `json:"updatedAt"`
}

// TableName specifies the table name for the Profile model
func (Profile) TableName() string {
	return "profiles"
}
