package models

import "time"

// AuditLog tracks sensitive actions for SOC 2 compliance
type AuditLog struct {
	ID         string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID     *string    `gorm:"type:uuid;index" json:"user_id,omitempty"`
	Action     string    `gorm:"not null" json:"action"`             // e.g., "LOGIN_SUCCESS", "UPDATE_ROLE", "DELETE_COURSE"
	Resource   string    `gorm:"not null" json:"resource"`           // e.g., "USER", "COURSE", "SETTINGS"
	ResourceID string    `json:"resource_id,omitempty"`
	Details    string    `gorm:"type:text" json:"details,omitempty"` // JSON or text description
	IPAddress  string    `json:"ip_address,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

// ConsentHistory tracks DPDP Act consent transitions
type ConsentHistory struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID    string    `gorm:"type:uuid;index;not null" json:"user_id"`
	Action    string    `gorm:"not null" json:"action"` // "GIVEN", "WITHDRAWN"
	Version   string    `gorm:"not null" json:"version"` // Policy version
	IPAddress string    `json:"ip_address,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}
