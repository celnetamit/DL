package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ListSettings — returns all settings (secrets masked)
func (h *Handler) ListSettings(c *gin.Context) {
	var settings []models.AppSetting
	if err := h.DB.Order("\"group\", key").Find(&settings).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch settings", nil)
		return
	}

	// Mask secret values before returning
	for i := range settings {
		if settings[i].IsSecret && settings[i].Value != "" {
			settings[i].Value = "••••••••"
		}
	}

	utils.JSON(c, http.StatusOK, "settings", settings)
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
