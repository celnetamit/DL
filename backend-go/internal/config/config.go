package config

import "os"

type Config struct {
  Port                  string
  DatabaseURL           string
  JwtSecret             string
  RazorpayKeyID         string
  RazorpayKeySecret     string
  RazorpayWebhookSecret string
  AppBaseURL            string
  AIEngineURL           string
}

func Load() Config {
  return Config{
    Port:                  getEnv("PORT", "8080"),
    DatabaseURL:           getEnv("DATABASE_URL", ""),
    JwtSecret:             getEnv("JWT_SECRET", "change-me"),
    RazorpayKeyID:         getEnv("RAZORPAY_KEY_ID", ""),
    RazorpayKeySecret:     getEnv("RAZORPAY_KEY_SECRET", ""),
    RazorpayWebhookSecret: getEnv("RAZORPAY_WEBHOOK_SECRET", ""),
    AppBaseURL:            getEnv("APP_BASE_URL", "http://localhost:3000"),
    AIEngineURL:           getEnv("AI_ENGINE_URL", "http://localhost:8000"),
  }
}

func getEnv(key, fallback string) string {
  if value := os.Getenv(key); value != "" {
    return value
  }
  return fallback
}
