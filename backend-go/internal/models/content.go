package models

import (
	"time"

	"gorm.io/datatypes"
)

type Content struct {
	ID        string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Type      string         `gorm:"not null;index" json:"type"`
	Title     string         `gorm:"not null" json:"title"`
	Status    string         `gorm:"default:Draft" json:"status"`
	SourceURL *string        `json:"source_url"`
	Metadata  datatypes.JSON `json:"metadata"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
}
