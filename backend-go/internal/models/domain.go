package models

import (
	"time"
)

type Domain struct {
	ID         string      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name       string      `gorm:"unique;not null" json:"name"`
	Subdomains []Subdomain `gorm:"foreignKey:DomainID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"subdomains,omitempty"`
	CreatedAt  time.Time   `json:"created_at"`
	UpdatedAt  time.Time   `json:"updated_at"`
}

type Subdomain struct {
	ID        string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	DomainID  string    `gorm:"type:uuid;not null;index" json:"domain_id"`
	Name      string    `gorm:"not null" json:"name"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}
