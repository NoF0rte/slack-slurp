package database

import (
	"errors"
	"fmt"

	"gorm.io/gorm"
)

// DetectorRepository provides methods for managing custom detectors
type DetectorRepository struct {
	db *gorm.DB
}

// NewDetectorRepository creates a new detector repository
func NewDetectorRepository(db *gorm.DB) *DetectorRepository {
	return &DetectorRepository{db: db}
}

// Create creates a new custom detector
func (r *DetectorRepository) Create(detector *CustomDetector) error {
	if err := r.db.Create(detector).Error; err != nil {
		return fmt.Errorf("failed to create custom detector: %w", err)
	}
	return nil
}

// GetByID retrieves a custom detector by ID
func (r *DetectorRepository) GetByID(id uint) (*CustomDetector, error) {
	var detector CustomDetector
	if err := r.db.First(&detector, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("custom detector with ID %d not found", id)
		}
		return nil, fmt.Errorf("failed to get custom detector: %w", err)
	}
	return &detector, nil
}

// GetByName retrieves a custom detector by name
func (r *DetectorRepository) GetByName(name string) (*CustomDetector, error) {
	var detector CustomDetector
	if err := r.db.Where("name = ?", name).First(&detector).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Not found, but not an error
		}
		return nil, fmt.Errorf("failed to get custom detector: %w", err)
	}
	return &detector, nil
}

// List retrieves all custom detectors
func (r *DetectorRepository) List() ([]CustomDetector, error) {
	var detectors []CustomDetector
	if err := r.db.Find(&detectors).Error; err != nil {
		return nil, fmt.Errorf("failed to list custom detectors: %w", err)
	}
	return detectors, nil
}

// Update updates an existing custom detector
func (r *DetectorRepository) Update(detector *CustomDetector) error {
	if err := r.db.Save(detector).Error; err != nil {
		return fmt.Errorf("failed to update custom detector: %w", err)
	}
	return nil
}

// Delete deletes a custom detector by ID (soft delete)
func (r *DetectorRepository) Delete(id uint) error {
	if err := r.db.Delete(&CustomDetector{}, id).Error; err != nil {
		return fmt.Errorf("failed to delete custom detector: %w", err)
	}
	return nil
}

// Exists checks if a custom detector with the given name exists (excluding the given ID if provided)
func (r *DetectorRepository) Exists(name string, excludeID *uint) bool {
	query := r.db.Where("name = ?", name)
	if excludeID != nil {
		query = query.Where("id != ?", *excludeID)
	}
	
	var count int64
	query.Model(&CustomDetector{}).Count(&count)
	return count > 0
}
