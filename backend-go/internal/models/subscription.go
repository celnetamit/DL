package models

import "time"

type Subscription struct {
	ID                     string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID                 *string    `gorm:"type:uuid" json:"user_id"`
	InstitutionID          *string    `gorm:"type:uuid;index" json:"institution_id"`
	ProductID              *string    `gorm:"type:uuid;index" json:"product_id"`
	PlanCode               string     `gorm:"not null" json:"plan_code"`
	Status                 string     `gorm:"not null;default:inactive" json:"status"`
	RazorpaySubscriptionID *string    `json:"razorpay_subscription_id"`
	RazorpayCustomerID     *string    `json:"razorpay_customer_id"`
	CurrentPeriodEnd       *time.Time `json:"current_period_end"`
	CancelAt               *time.Time `json:"cancel_at"`
	CreatedAt              time.Time  `json:"created_at"`
	UpdatedAt              time.Time  `json:"updated_at"`
}

type Purchase struct {
	ID                string     `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID            *string    `gorm:"type:uuid;index" json:"user_id"`
	InstitutionID     *string    `gorm:"type:uuid;index" json:"institution_id"`
	ProductID         *string    `gorm:"type:uuid;index" json:"product_id"`
	SubscriptionID    *string    `gorm:"type:uuid;index" json:"subscription_id"`
	PaymentID         *string    `gorm:"type:uuid;index" json:"payment_id"`
	PlanCode          string     `gorm:"index" json:"plan_code"`
	PurchaseType      string     `gorm:"not null;default:one_time" json:"purchase_type"`
	AccessStatus      string     `gorm:"not null;default:pending" json:"access_status"`
	PaymentStatus     string     `gorm:"not null;default:created" json:"payment_status"`
	Amount            int        `json:"amount"`
	Currency          string     `gorm:"default:INR" json:"currency"`
	ActivatedAt       *time.Time `json:"activated_at"`
	AccessEndsAt      *time.Time `json:"access_ends_at"`
	RazorpayOrderID   *string    `json:"razorpay_order_id"`
	RazorpayPaymentID *string    `json:"razorpay_payment_id"`
	CreatedAt         time.Time  `json:"created_at"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

type Payment struct {
	ID                string    `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	UserID            *string   `gorm:"type:uuid" json:"user_id"`
	InstitutionID     *string   `gorm:"type:uuid;index" json:"institution_id"`
	SubscriptionID    *string   `gorm:"type:uuid" json:"subscription_id"`
	ProductID         *string   `gorm:"type:uuid;index" json:"product_id"`
	PlanCode          string    `gorm:"index" json:"plan_code"`
	Description       string    `json:"description"`
	RazorpayPaymentID *string   `json:"razorpay_payment_id"`
	RazorpayOrderID   *string   `json:"razorpay_order_id"`
	Amount            int       `json:"amount"`
	Currency          string    `gorm:"default:INR" json:"currency"`
	Status            string    `json:"status"`
	CreatedAt         time.Time `json:"created_at"`
}
