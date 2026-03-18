package models

import (
	"time"

	"gorm.io/datatypes"
)

type Course struct {
	ID          string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Title       string    `gorm:"not null" json:"title"`
	Description *string   `json:"description"`
	Domain      string    `gorm:"not null;default:General" json:"domain"`
	Subdomain   *string   `json:"subdomain"`
	AuthorID    *string   `gorm:"type:uuid" json:"author_id"`
	Level       string    `gorm:"default:beginner" json:"level"`
	Status      string    `gorm:"default:draft" json:"status"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Modules     []Module  `json:"modules"`
}

type Module struct {
	ID        string   `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	CourseID  string   `gorm:"type:uuid;not null" json:"course_id"`
	Title     string   `gorm:"not null" json:"title"`
	Status    string   `gorm:"default:draft" json:"status"`
	SortOrder int      `json:"sort_order"`
	Lessons   []Lesson `json:"lessons"`
}

type Lesson struct {
	ID              string  `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	ModuleID        string  `gorm:"type:uuid;not null" json:"module_id"`
	Title           string  `gorm:"not null" json:"title"`
	ContentType     string  `gorm:"default:Videos" json:"content_type"`
	Status          string  `gorm:"default:draft" json:"status"`
	SourceURL       *string `json:"source_url"`
	ContentURL      *string `json:"content_url"`
	DurationSeconds int     `json:"duration_seconds"`
	SortOrder       int     `json:"sort_order"`
	Metadata        datatypes.JSON `json:"metadata"`
}

type Progress struct {
	ID                  string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID              string     `gorm:"type:uuid;not null" json:"user_id"`
	LessonID            string     `gorm:"type:uuid;not null" json:"lesson_id"`
	ProgressPercent     int        `json:"progress_percent"`
	LastPositionSeconds int        `json:"last_position_seconds"`
	CompletedAt         *time.Time `json:"completed_at"`
	UpdatedAt           time.Time  `json:"updated_at"`
}

func (Progress) TableName() string {
	return "progress"
}
