package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Port                  string
	DatabaseURL           string
	JwtSecret             string
	RazorpayKeyID         string
	RazorpayKeySecret     string
	RazorpayWebhookSecret string
	AppBaseURL            string
	AIEngineURL           string
	GoogleClientID        string
	GoogleClientSecret    string
	GoogleRedirectURL     string
	AppEnv                string
	TrustedProxies        []string
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
		GoogleClientID:        getEnv("GOOGLE_CLIENT_ID", ""),
		GoogleClientSecret:    getEnv("GOOGLE_CLIENT_SECRET", ""),
		GoogleRedirectURL:     getEnv("GOOGLE_REDIRECT_URL", "http://localhost:8080/api/v1/auth/google/callback"),
		AppEnv:                strings.ToLower(getEnv("APP_ENV", "development")),
		TrustedProxies:        splitCSV(getEnv("TRUSTED_PROXIES", "")),
	}
}

func (c Config) IsProduction() bool {
	return c.AppEnv == "production" || strings.EqualFold(os.Getenv("GIN_MODE"), "release")
}

func (c Config) Validate() error {
	if c.DatabaseURL == "" {
		return fmt.Errorf("DATABASE_URL is required")
	}
	if c.Port == "" {
		return fmt.Errorf("PORT is required")
	}
	if c.JwtSecret == "" {
		return fmt.Errorf("JWT_SECRET is required")
	}
	if (c.RazorpayKeyID == "") != (c.RazorpayKeySecret == "") {
		return fmt.Errorf("RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET must both be set together")
	}
	if (c.GoogleClientID == "") != (c.GoogleClientSecret == "") {
		return fmt.Errorf("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must both be set together")
	}
	if (c.GoogleClientID != "" || c.GoogleClientSecret != "") && c.GoogleRedirectURL == "" {
		return fmt.Errorf("GOOGLE_REDIRECT_URL is required when Google OAuth is enabled")
	}

	if c.IsProduction() {
		if len(c.JwtSecret) < 32 || c.JwtSecret == "change-me" {
			return fmt.Errorf("JWT_SECRET must be a strong production secret at least 32 characters long")
		}
		if !strings.HasPrefix(c.AppBaseURL, "https://") {
			return fmt.Errorf("APP_BASE_URL must use https in production")
		}
		if c.GoogleRedirectURL != "" && !strings.HasPrefix(c.GoogleRedirectURL, "https://") {
			return fmt.Errorf("GOOGLE_REDIRECT_URL must use https in production")
		}
	}

	return nil
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func splitCSV(value string) []string {
	if strings.TrimSpace(value) == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		trimmed := strings.TrimSpace(part)
		if trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
