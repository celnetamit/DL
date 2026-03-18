package handlers

import (
  "lms-backend/internal/config"
  "lms-backend/internal/services"

  "gorm.io/gorm"
)

type Handler struct {
  DB       *gorm.DB
  Config   config.Config
  Razorpay services.RazorpayService
}
