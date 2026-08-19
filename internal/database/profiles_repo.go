package database

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// ProfileRepository provides methods for managing profiles
type ProfileRepository struct {
	db *gorm.DB
}

// NewProfileRepository creates a new profile repository
func NewProfileRepository(db *gorm.DB) *ProfileRepository {
	return &ProfileRepository{db: db}
}

// Create creates a new profile
func (r *ProfileRepository) Create(profile *Profile) error {
	if err := r.db.Create(profile).Error; err != nil {
		return fmt.Errorf("failed to create profile: %w", err)
	}
	return nil
}

// GetByID retrieves a profile by ID
func (r *ProfileRepository) GetByID(id uint) (*Profile, error) {
	var profile Profile
	if err := r.db.First(&profile, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("profile with ID %d not found", id)
		}
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	return &profile, nil
}

// GetByName retrieves a profile by name
func (r *ProfileRepository) GetByName(name string) (*Profile, error) {
	var profile Profile
	if err := r.db.Where("name = ?", name).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Not found, but not an error
		}
		return nil, fmt.Errorf("failed to get profile: %w", err)
	}
	return &profile, nil
}

// List retrieves all profiles
func (r *ProfileRepository) List() ([]Profile, error) {
	var profiles []Profile
	if err := r.db.Find(&profiles).Error; err != nil {
		return nil, fmt.Errorf("failed to list profiles: %w", err)
	}
	return profiles, nil
}

// Update updates an existing profile
func (r *ProfileRepository) Update(profile *Profile) error {
	if err := r.db.Save(profile).Error; err != nil {
		return fmt.Errorf("failed to update profile: %w", err)
	}
	return nil
}

// Delete deletes a profile by ID (soft delete)
func (r *ProfileRepository) Delete(id uint) error {
	if err := r.db.Delete(&Profile{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete profile: %w", err)
	}
	return nil
}

// Exists checks if a profile with the given name exists (excluding the given ID if provided)
func (r *ProfileRepository) Exists(name string, excludeID *uint) bool {
	query := r.db.Where("name = ?", name)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}

	var count int64
	query.Model(&Profile{}).Count(&count)
	return count > 0
}

// GetSelected retrieves the currently selected profile
func (r *ProfileRepository) GetSelected() (*Profile, error) {
	var profile Profile
	if err := r.db.Where("is_selected = ?", true).First(&profile).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No profile selected
		}
		return nil, fmt.Errorf("failed to get selected profile: %w", err)
	}
	return &profile, nil
}

// SetSelected sets a profile as selected and unselects all others
func (r *ProfileRepository) SetSelected(profileID uint) error {
	// First, unselect all profiles
	if err := r.db.Model(&Profile{}).Where("is_selected = ?", true).Update("is_selected", false).Error; err != nil {
		return fmt.Errorf("failed to unselect profiles: %w", err)
	}

	// Then select the specified profile
	if err := r.db.Model(&Profile{}).Where("id = ?", profileID).Update("is_selected", true).Error; err != nil {
		return fmt.Errorf("failed to select profile: %w", err)
	}

	return nil
}

// Count returns the total number of profiles
func (r *ProfileRepository) Count() (int64, error) {
	var count int64
	if err := r.db.Model(&Profile{}).Count(&count).Error; err != nil {
		return 0, fmt.Errorf("failed to count profiles: %w", err)
	}
	return count, nil
}
