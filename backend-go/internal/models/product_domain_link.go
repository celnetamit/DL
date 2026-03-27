package models

import "time"

type ProductDomainLink struct {
	ProductID string    `gorm:"type:uuid;primaryKey" json:"product_id"`
	DomainID  string    `gorm:"type:uuid;primaryKey" json:"domain_id"`
	CreatedAt time.Time `json:"created_at"`
	Product   Product   `gorm:"foreignKey:ProductID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	Domain    Domain    `gorm:"foreignKey:DomainID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
