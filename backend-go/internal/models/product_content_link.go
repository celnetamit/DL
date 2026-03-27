package models

import "time"

type ProductContentLink struct {
	ProductID string    `gorm:"type:uuid;primaryKey" json:"product_id"`
	ContentID string    `gorm:"type:uuid;primaryKey" json:"content_id"`
	CreatedAt time.Time `json:"created_at"`
	Product   Product   `gorm:"foreignKey:ProductID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
	Content   Content   `gorm:"foreignKey:ContentID;references:ID;constraint:OnDelete:CASCADE" json:"-"`
}
