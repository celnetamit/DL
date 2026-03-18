package models

import "time"

// AppSetting stores configurable API keys & settings in the DB.
// The key field is the setting identifier (e.g. "RAZORPAY_KEY_ID").
type AppSetting struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Key       string    `gorm:"uniqueIndex;not null" json:"key"`
	Value     string    `gorm:"type:text" json:"value"`
	Label     string    `gorm:"type:varchar(200)" json:"label"`
	Group     string    `gorm:"type:varchar(100)" json:"group"`
	IsSecret  bool      `gorm:"default:false" json:"is_secret"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
