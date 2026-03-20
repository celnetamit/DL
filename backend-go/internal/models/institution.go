package models

import (
	"time"

	"gorm.io/gorm"
)

type Institution struct {
	ID           string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name         string         `gorm:"type:varchar(255);not null" json:"name"`
	Domain       string         `gorm:"type:varchar(255);uniqueIndex" json:"domain"` // e.g., "mit.edu"
	Code         string         `gorm:"type:varchar(50);uniqueIndex" json:"code"`    // e.g., "MIT2026"
	Status       string         `gorm:"type:varchar(50);default:'active'" json:"status"`
	StudentLimit int            `gorm:"default:0" json:"student_limit"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
