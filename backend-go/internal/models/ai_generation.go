package models

import (
	"time"

	"gorm.io/datatypes"
)

type AIGenerationLog struct {
	ID              string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID          *string        `gorm:"type:uuid;index" json:"user_id"`
	CourseID        string         `gorm:"type:uuid;index;not null" json:"course_id"`
	ModuleID        string         `gorm:"type:uuid;index;not null" json:"module_id"`
	LessonID        *string        `gorm:"type:uuid;index" json:"lesson_id"`
	Provider        string         `gorm:"type:varchar(100);not null" json:"provider"`
	Model           string         `gorm:"type:varchar(150);not null" json:"model"`
	PromptVersion   string         `gorm:"type:varchar(50);not null;default:'v1'" json:"prompt_version"`
	Status          string         `gorm:"type:varchar(50);not null;default:'success'" json:"status"`
	FailureCode     string         `gorm:"type:varchar(100);not null;default:''" json:"failure_code"`
	FailureCategory string         `gorm:"type:varchar(100);not null;default:''" json:"failure_category"`
	SourceType      string         `gorm:"type:varchar(50);not null" json:"source_type"`
	SourceURL       *string        `json:"source_url"`
	RequestedTitle  string         `gorm:"type:text" json:"requested_title"`
	ErrorMessage    string         `gorm:"type:text" json:"error_message"`
	RequestPayload  datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"request_payload"`
	ResponsePayload datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"response_payload"`
	CreatedAt       time.Time      `json:"created_at"`
}
