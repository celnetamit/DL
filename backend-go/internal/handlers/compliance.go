package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/models"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// LogActivity is a helper to log audit events
func (h *Handler) LogActivity(c *gin.Context, userID *string, action, resource, resourceID, details string) {
	log := models.AuditLog{
		UserID:     userID,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Details:    details,
		IPAddress:  c.ClientIP(),
		UserAgent:  c.Request.UserAgent(),
	}
	h.DB.Create(&log)
}

// GiveConsent handles DPDP consent giving
func (h *Handler) GiveConsent(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	now := time.Now()
	user.ConsentGiven = true
	user.ConsentAt = &now
	h.DB.Save(&user)

	// Log in history
	history := models.ConsentHistory{
		UserID:    userID,
		Action:    "GIVEN",
		Version:   "1.0 (DPDP 2023 Compliant)",
		IPAddress: c.ClientIP(),
	}
	h.DB.Create(&history)

	h.LogActivity(c, &userID, "CONSENT_GIVEN", "USER", userID, "User accepted privacy terms")

	c.JSON(http.StatusOK, gin.H{"message": "consent recorded"})
}

// ExportMyData handles Data Portability (DPDP/GDPR)
func (h *Handler) ExportMyData(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := h.DB.Preload("Roles").First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Fetch all related data
	var payments []models.Payment
	h.DB.Where("user_id = ?", userID).Find(&payments)

	var subscriptions []models.Subscription
	h.DB.Where("user_id = ?", userID).Find(&subscriptions)

	var purchases []models.Purchase
	h.DB.Where("user_id = ?", userID).Find(&purchases)

	var progress []models.Progress
	h.DB.Where("user_id = ?", userID).Find(&progress)

	var awards []models.CourseAward
	h.DB.Where("user_id = ?", userID).Find(&awards)

	var leadEvents []models.LeadEvent
	h.DB.Where("user_id = ?", userID).Find(&leadEvents)

	var consentHistory []models.ConsentHistory
	h.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&consentHistory)

	var auditLogs []models.AuditLog
	h.DB.Where("user_id = ?", userID).Order("created_at desc").Find(&auditLogs)

	var presets []models.ContentFilterPreset
	h.DB.Where("user_id = ?", userID).Order("updated_at desc").Find(&presets)

	data := gin.H{
		"user":            user,
		"payments":        payments,
		"subscriptions":   subscriptions,
		"purchases":       purchases,
		"progress":        progress,
		"course_awards":   awards,
		"lead_events":     leadEvents,
		"consent_history": consentHistory,
		"audit_logs":      auditLogs,
		"content_presets": presets,
		"exported_at":     time.Now(),
		"export_summary": gin.H{
			"payments_count":        len(payments),
			"subscriptions_count":   len(subscriptions),
			"purchases_count":       len(purchases),
			"progress_rows_count":   len(progress),
			"course_awards_count":   len(awards),
			"lead_events_count":     len(leadEvents),
			"consent_history_count": len(consentHistory),
			"audit_logs_count":      len(auditLogs),
			"content_presets_count": len(presets),
		},
	}

	h.LogActivity(c, &userID, "DATA_EXPORT", "USER", userID, "User requested data export")

	c.JSON(http.StatusOK, data)
}

// DeleteMyAccount handles Right to Erase (DPDP/GDPR)
func (h *Handler) DeleteMyAccount(c *gin.Context) {
	userID := c.GetString("user_id")
	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	// Complex deletion logic (anonymization is often preferred for SOC 2 logs,
	// but DPDP requires erasure of personal data)

	// Log before deletion
	h.LogActivity(c, &userID, "ACCOUNT_DELETION_REQUEST", "USER", userID, "User requested account deletion")

	// Transactional delete
	err := h.DB.Transaction(func(tx *gorm.DB) error {
		anonymizedEmail := anonymizedValue("deleted-user", userID)
		anonymizedName := "Deleted User"
		anonymizedPhone := ""
		anonymizedDetails := fmt.Sprintf("User account %s was deleted and personal data was anonymized.", userID)

		if err := tx.Model(&models.LeadEvent{}).
			Where("user_id = ?", userID).
			Updates(map[string]any{
				"user_id":          nil,
				"full_name":        anonymizedName,
				"email":            anonymizedEmail,
				"phone":            anonymizedPhone,
				"institution_name": "",
				"subject":          "Deleted User Request",
				"message":          "",
				"metadata":         json.RawMessage(`{"anonymized":true}`),
			}).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Payment{}).Where("user_id = ?", userID).Update("user_id", nil).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Purchase{}).Where("user_id = ?", userID).Update("user_id", nil).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.Subscription{}).Where("user_id = ?", userID).Update("user_id", nil).Error; err != nil {
			return err
		}

		if err := tx.Model(&models.AuditLog{}).
			Where("user_id = ?", userID).
			Updates(map[string]any{
				"user_id":    nil,
				"details":    anonymizedDetails,
				"ip_address": "",
				"user_agent": "",
			}).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ?", userID).Delete(&models.ConsentHistory{}).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ?", userID).Delete(&models.ContentFilterPreset{}).Error; err != nil {
			return err
		}

		if err := tx.Where("user_id = ?", userID).Delete(&models.CourseAward{}).Error; err != nil {
			return err
		}

		if err := tx.Exec("DELETE FROM user_roles WHERE user_id = ?", userID).Error; err != nil {
			return err
		}

		// 1. Delete progress
		if err := tx.Where("user_id = ?", userID).Delete(&models.Progress{}).Error; err != nil {
			return err
		}

		// 2. Delete user
		if err := tx.Delete(&models.User{}, "id = ?", userID).Error; err != nil {
			return err
		}
		return nil
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "account deleted successfully"})
}

func anonymizedValue(prefix, userID string) string {
	compact := strings.ReplaceAll(userID, "-", "")
	if len(compact) > 12 {
		compact = compact[:12]
	}
	return fmt.Sprintf("%s-%s@redacted.local", prefix, compact)
}

// GetAuditLogs (Admin only) for SOC 2
func (h *Handler) GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	h.DB.Order("created_at desc").Limit(100).Find(&logs)
	c.JSON(http.StatusOK, logs)
}
