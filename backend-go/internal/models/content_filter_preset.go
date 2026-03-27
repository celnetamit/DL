package models

import (
	"time"

	"gorm.io/datatypes"
)

type ContentFilterPreset struct {
	ID         string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     string         `gorm:"type:uuid;not null;index" json:"user_id"`
	Category   string         `gorm:"not null;index" json:"category"`
	Name       string         `gorm:"not null" json:"name"`
	FilterData datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"filter_data"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
}

func (ContentFilterPreset) TableName() string {
	return "content_filter_presets"
}
