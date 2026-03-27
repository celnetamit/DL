package handlers

import (
	"net/http"
	"os"
	"regexp"
	"strings"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type settingCatalogItem struct {
	Key      string
	Label    string
	Group    string
	IsSecret bool
}

var settingCatalog = []settingCatalogItem{
	{Key: "RAZORPAY_KEY_ID", Label: "Razorpay Key ID", Group: "Payment Gateway", IsSecret: false},
	{Key: "RAZORPAY_KEY_SECRET", Label: "Razorpay Key Secret", Group: "Payment Gateway", IsSecret: true},
	{Key: "RAZORPAY_WEBHOOK_SECRET", Label: "Razorpay Webhook Secret", Group: "Payment Gateway", IsSecret: true},
	{Key: "JWT_SECRET", Label: "JWT Secret Key", Group: "Authentication", IsSecret: true},
	{Key: "APP_BASE_URL", Label: "App Base URL", Group: "Application", IsSecret: false},
	{Key: "AI_ENGINE_URL", Label: "AI Engine URL", Group: "Application", IsSecret: false},
	{Key: "TRUSTED_PROXIES", Label: "Trusted Proxies", Group: "Application", IsSecret: false},
	{Key: "LEAD_WEBHOOK_URL", Label: "Lead Webhook URL", Group: "CRM & Leads", IsSecret: false},
	{Key: "LEAD_WEBHOOK_SECRET", Label: "Lead Webhook Secret", Group: "CRM & Leads", IsSecret: true},
	{Key: "LEAD_COMPANY_ID", Label: "Lead Company ID", Group: "CRM & Leads", IsSecret: false},
	{Key: "AWS_REGION", Label: "AWS Region", Group: "Email & Notifications", IsSecret: false},
	{Key: "SES_FROM_EMAIL", Label: "SES From Email", Group: "Email & Notifications", IsSecret: false},
	{Key: "SES_CONFIGURATION_SET", Label: "SES Configuration Set", Group: "Email & Notifications", IsSecret: false},
	{Key: "SNS_ALERT_TOPIC_ARN", Label: "SNS Alert Topic ARN", Group: "Email & Notifications", IsSecret: false},
	{Key: "SES_SNS_TOPIC_ARN", Label: "SES SNS Topic ARN", Group: "Email & Notifications", IsSecret: false},
	{Key: "GOOGLE_CLIENT_ID", Label: "Google OAuth Client ID", Group: "OAuth", IsSecret: false},
	{Key: "GOOGLE_CLIENT_SECRET", Label: "Google OAuth Client Secret", Group: "OAuth", IsSecret: true},
	{Key: "GOOGLE_REDIRECT_URL", Label: "Google OAuth Redirect URL", Group: "OAuth", IsSecret: false},
}

// ListSettings — returns all settings (secrets masked)
func (h *Handler) ListSettings(c *gin.Context) {
	var stored []models.AppSetting
	if err := h.DB.Order("\"group\", key").Find(&stored).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch settings", nil)
		return
	}

	storedByKey := make(map[string]models.AppSetting, len(stored))
	for _, setting := range stored {
		storedByKey[setting.Key] = setting
	}

	response := make([]gin.H, 0, len(settingCatalog))
	for _, def := range settingCatalog {
		record, hasDBValue := storedByKey[def.Key]
		envValue, envPresent := settingEnvValue(def.Key)

		displayValue := ""
		dbConfigured := hasDBValue && strings.TrimSpace(record.Value) != ""
		if dbConfigured {
			displayValue = record.Value
		} else if envPresent {
			displayValue = envValue
		}
		if def.IsSecret && displayValue != "" {
			displayValue = "••••••••"
		}

		effectiveSource := "unset"
		switch {
		case dbConfigured:
			effectiveSource = "db_override"
		case envPresent:
			effectiveSource = "env_fallback"
		}

		response = append(response, gin.H{
			"id":               record.ID,
			"key":              def.Key,
			"value":            displayValue,
			"label":            firstNonBlankSetting(record.Label, def.Label),
			"group":            firstNonBlankSetting(record.Group, def.Group),
			"is_secret":        def.IsSecret,
			"effective_source": effectiveSource,
			"db_configured":    dbConfigured,
			"env_configured":   envPresent,
			"validation_errors": validateSettingValue(def.Key, func() string {
				if dbConfigured {
					return record.Value
				}
				return envValue
			}()),
		})
	}

	utils.JSON(c, http.StatusOK, "settings", response)
}

// UpsertSetting — creates or updates a single setting
func (h *Handler) UpsertSetting(c *gin.Context) {
	var req struct {
		Key      string `json:"key" binding:"required"`
		Value    string `json:"value"`
		Label    string `json:"label"`
		Group    string `json:"group"`
		IsSecret bool   `json:"is_secret"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	setting := models.AppSetting{
		Key:      req.Key,
		Value:    req.Value,
		Label:    req.Label,
		Group:    req.Group,
		IsSecret: req.IsSecret,
	}

	// Upsert: if key exists update, else create
	result := h.DB.Where(models.AppSetting{Key: req.Key}).FirstOrCreate(&setting)
	if result.Error != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to save setting", nil)
		return
	}

	// If record already existed, update it
	if result.RowsAffected == 0 {
		if req.Value != "••••••••" { // Don't overwrite with masked placeholder
			setting.Value = req.Value
		}
		setting.Label = req.Label
		setting.Group = req.Group
		setting.IsSecret = req.IsSecret
		h.DB.Save(&setting)
	}

	utils.JSON(c, http.StatusOK, "setting saved", gin.H{"key": setting.Key})
}

// BulkUpsertSettings — saves multiple settings at once
func (h *Handler) BulkUpsertSettings(c *gin.Context) {
	var req []struct {
		Key      string `json:"key"`
		Value    string `json:"value"`
		Label    string `json:"label"`
		Group    string `json:"group"`
		IsSecret bool   `json:"is_secret"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	for _, r := range req {
		if r.Key == "" {
			continue
		}
		var existing models.AppSetting
		result := h.DB.Where("key = ?", r.Key).First(&existing)
		if result.Error != nil {
			// Create
			h.DB.Create(&models.AppSetting{
				Key: r.Key, Value: r.Value, Label: r.Label, Group: r.Group, IsSecret: r.IsSecret,
			})
		} else {
			// Update only if value is not the masked placeholder
			if r.Value != "••••••••" {
				existing.Value = r.Value
			}
			existing.Label = r.Label
			existing.Group = r.Group
			existing.IsSecret = r.IsSecret
			h.DB.Save(&existing)
		}
	}

	utils.JSON(c, http.StatusOK, "settings saved", nil)

	// Audit Log
	uID, _ := c.Get("user_id")
	if uID != nil {
		uIDStr := uID.(string)
		h.LogActivity(c, &uIDStr, "UPDATE_SETTINGS", "SETTINGS", "SYSTEM", "Admin updated bulk settings")
	}
}

// GetSettingValue — internal helper used by other handlers to read a setting
func (h *Handler) GetSettingValue(key, fallback string) string {
	var s models.AppSetting
	if err := h.DB.Select("value").Where("key = ?", key).First(&s).Error; err != nil {
		return fallback
	}
	if s.Value == "" {
		return fallback
	}
	return s.Value
}

func settingEnvValue(key string) (string, bool) {
	candidates := []string{key}
	if key == "LEAD_WEBHOOK_URL" {
		candidates = append(candidates, "CRM_WEBHOOK_URL")
	}
	if key == "LEAD_WEBHOOK_SECRET" {
		candidates = append(candidates, "CRM_WEBHOOK_SECRET")
	}

	for _, candidate := range candidates {
		if value := strings.TrimSpace(os.Getenv(candidate)); value != "" {
			return value, true
		}
	}
	return "", false
}

func validateSettingValue(key, value string) []string {
	value = strings.TrimSpace(value)
	if value == "" {
		return nil
	}

	var issues []string
	isURL := regexp.MustCompile(`^https?://`)
	isAWSRegion := regexp.MustCompile(`^[a-z]{2}-[a-z]+-\d$`)
	isEmail := regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`)
	isGoogleClientID := regexp.MustCompile(`\.apps\.googleusercontent\.com$`)
	isTopicARN := regexp.MustCompile(`^arn:aws:sns:[a-z0-9-]+:\d{12}:.+$`)

	switch key {
	case "APP_BASE_URL", "AI_ENGINE_URL", "LEAD_WEBHOOK_URL", "GOOGLE_REDIRECT_URL":
		if !isURL.MatchString(value) {
			issues = append(issues, "Must be a valid http or https URL.")
		}
	case "AWS_REGION":
		if !isAWSRegion.MatchString(value) {
			issues = append(issues, "Must look like a valid AWS region, for example ap-south-1.")
		}
	case "SES_FROM_EMAIL":
		if !isEmail.MatchString(value) {
			issues = append(issues, "Must be a valid email address.")
		}
	case "SNS_ALERT_TOPIC_ARN", "SES_SNS_TOPIC_ARN":
		if !isTopicARN.MatchString(value) {
			issues = append(issues, "Must be a valid SNS topic ARN.")
		}
	case "GOOGLE_CLIENT_ID":
		if !isGoogleClientID.MatchString(value) {
			issues = append(issues, "Should end with .apps.googleusercontent.com.")
		}
	case "JWT_SECRET":
		if len(value) < 32 {
			issues = append(issues, "Should be at least 32 characters long for production use.")
		}
	case "TRUSTED_PROXIES":
		if strings.Contains(value, " ") {
			issues = append(issues, "Use a comma-separated list without spaces around IP values.")
		}
	}

	return issues
}

func firstNonBlankSetting(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
