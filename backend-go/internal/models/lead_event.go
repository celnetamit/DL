package models

import (
	"time"

	"gorm.io/datatypes"
)

type LeadEvent struct {
	ID               string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID           *string        `gorm:"type:uuid;index" json:"user_id"`
	InstitutionID    *string        `gorm:"type:uuid;index" json:"institution_id"`
	ProductID        *string        `gorm:"type:uuid;index" json:"product_id"`
	PaymentID        *string        `gorm:"type:uuid;index" json:"payment_id"`
	LeadType         string         `gorm:"size:50;index;not null" json:"lead_type"`
	Source           string         `gorm:"size:100;index;not null" json:"source"`
	FullName         string         `gorm:"size:255;not null" json:"full_name"`
	Email            string         `gorm:"size:255;index;not null" json:"email"`
	Phone            string         `gorm:"size:50" json:"phone"`
	InstitutionName  string         `gorm:"size:255" json:"institution_name"`
	Subject          string         `gorm:"size:255" json:"subject"`
	Message          string         `gorm:"type:text" json:"message"`
	PlanCode         string         `gorm:"size:150;index" json:"plan_code"`
	ProductName      string         `gorm:"size:255" json:"product_name"`
	Amount           *int           `json:"amount"`
	Currency         string         `gorm:"size:16;default:INR" json:"currency"`
	SyncStatus       string         `gorm:"size:50;index;not null;default:pending" json:"sync_status"`
	SyncAttemptCount int            `gorm:"not null;default:0" json:"sync_attempt_count"`
	LastError        string         `gorm:"type:text" json:"last_error"`
	SyncedAt         *time.Time     `json:"synced_at"`
	LastAttemptedAt  *time.Time     `json:"last_attempted_at"`
	Metadata         datatypes.JSON `gorm:"type:jsonb;default:'{}'" json:"metadata"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}
