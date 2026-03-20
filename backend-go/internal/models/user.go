package models

import "time"

type User struct {
	ID            string       `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email         string       `gorm:"uniqueIndex;not null" json:"email"`
	PasswordHash  *string      `gorm:"default:null" json:"-"`
	FullName      string       `gorm:"not null" json:"full_name"`
	Status        string       `gorm:"not null;default:active" json:"status"`
	GoogleID      *string      `gorm:"uniqueIndex;default:null" json:"google_id,omitempty"`
	AvatarURL     *string      `gorm:"default:null" json:"avatar_url,omitempty"`
	LastLoginAt   *time.Time   `json:"last_login_at"`
	LastActiveAt  *time.Time   `json:"last_active_at"`
	InstitutionID *string      `gorm:"type:uuid;index" json:"institution_id"`
	Institution   *Institution `gorm:"foreignKey:InstitutionID" json:"institution,omitempty"`
	CreatedAt     time.Time    `json:"created_at"`
	UpdatedAt     time.Time    `json:"updated_at"`
	Roles         []Role       `gorm:"many2many:user_roles" json:"roles"`

	// DPDP Compliance
	ConsentGiven bool       `gorm:"default:false" json:"consent_given"`
	ConsentAt    *time.Time `json:"consent_at,omitempty"`
}

type Role struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name      string    `gorm:"uniqueIndex;not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
}
