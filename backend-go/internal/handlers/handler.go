package handlers

import (
	"lms-backend/internal/config"
	"lms-backend/internal/services"

	"golang.org/x/oauth2"
	"gorm.io/gorm"
)

type Handler struct {
	DB          *gorm.DB
	Config      config.Config
	Razorpay    services.RazorpayService
	LeadWebhook services.LeadWebhookService
	Notifier    *services.NotificationService
	GoogleOAuth *oauth2.Config
}
