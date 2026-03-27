package models

import "time"

type ContentDomainLink struct {
	ContentID   string     `gorm:"type:uuid;primaryKey" json:"content_id"`
	DomainID    string     `gorm:"type:uuid;not null;primaryKey" json:"domain_id"`
	SubdomainID *string    `gorm:"type:uuid" json:"subdomain_id"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
	Content     Content    `gorm:"foreignKey:ContentID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	Domain      Domain     `gorm:"foreignKey:DomainID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	Subdomain   *Subdomain `gorm:"foreignKey:SubdomainID;references:ID;constraint:OnDelete:SET NULL" json:"-"`
}
