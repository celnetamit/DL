package models

import (
	"time"

	"gorm.io/datatypes"
)

type EmailEvent struct {
	ID                string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	SNSMessageID      string         `gorm:"size:255;uniqueIndex;not null" json:"sns_message_id"`
	TopicARN          string         `gorm:"size:500;index;not null" json:"topic_arn"`
	EventType         string         `gorm:"size:100;index;not null" json:"event_type"`
	NotificationType  string         `gorm:"size:100;index;not null" json:"notification_type"`
	SESMessageID      string         `gorm:"size:255;index" json:"ses_message_id"`
	SourceEmail       string         `gorm:"size:255;index" json:"source_email"`
	Subject           string         `gorm:"size:500" json:"subject"`
	PrimaryRecipient  string         `gorm:"size:255;index" json:"primary_recipient"`
	Status            string         `gorm:"size:100;index;not null" json:"status"`
	DiagnosticMessage string         `gorm:"type:text" json:"diagnostic_message"`
	EventAt           *time.Time     `json:"event_at"`
	RawPayload        datatypes.JSON `gorm:"type:jsonb;not null;default:'{}'" json:"raw_payload"`
	CreatedAt         time.Time      `json:"created_at"`
}
