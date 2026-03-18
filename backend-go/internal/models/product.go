package models

import (
	"time"

	"github.com/lib/pq"
)

type Product struct {
	ID               string         `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Name             string         `gorm:"not null" json:"name"`
	Description      string         `gorm:"type:text" json:"description"`
	Price            float64        `gorm:"not null" json:"price"`
	Currency         string         `gorm:"default:'INR'" json:"currency"`
	Tier             string         `gorm:"not null" json:"tier"` // content, subdomain, domain, bundle
	ContentTypes     pq.StringArray `gorm:"type:text[]" json:"content_types"`
	DomainID         *string        `gorm:"type:uuid" json:"domain_id"`
	SubdomainID      *string        `gorm:"type:uuid" json:"subdomain_id"`
	ContentID        *string        `gorm:"type:uuid" json:"content_id"`
	BundleDomainIDs  pq.StringArray `gorm:"type:text[]" json:"bundle_domain_ids"`
	Status           string         `gorm:"default:'draft'" json:"status"`
	RazorpayPlanID   *string        `json:"razorpay_plan_id"`
	CreatedAt        time.Time      `json:"created_at"`
	UpdatedAt        time.Time      `json:"updated_at"`
}
