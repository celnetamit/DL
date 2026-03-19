package handlers

import (
	"net/http"
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

	var progress []models.Progress
	h.DB.Where("user_id = ?", userID).Find(&progress)

	data := gin.H{
		"user":     user,
		"payments": payments,
		"progress": progress,
		"exported_at": time.Now(),
	}

	h.LogActivity(c, &userID, "DATA_EXPORT", "USER", userID, "User requested data export")

	c.JSON(http.StatusOK, data)
}

// DeleteMyAccount handles Right to Erase (DPDP/GDPR)
func (h *Handler) DeleteMyAccount(c *gin.Context) {
	userID := c.GetString("user_id")
	
	// Complex deletion logic (anonymization is often preferred for SOC 2 logs, 
	// but DPDP requires erasure of personal data)
	
	// Log before deletion
	h.LogActivity(c, &userID, "ACCOUNT_DELETION_REQUEST", "USER", userID, "User requested account deletion")

	// Transactional delete
	err := h.DB.Transaction(func(tx *gorm.DB) error {
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

// GetAuditLogs (Admin only) for SOC 2
func (h *Handler) GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog
	h.DB.Order("created_at desc").Limit(100).Find(&logs)
	c.JSON(http.StatusOK, logs)
}
