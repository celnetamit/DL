package handlers

import (
	"net/http"
	"strings"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type contentFilterPresetPayload struct {
	Category   string         `json:"category" binding:"required"`
	Name       string         `json:"name" binding:"required"`
	FilterData datatypes.JSON `json:"filter_data" binding:"required"`
}

func (h *Handler) ListContentFilterPresets(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("user_id"))
	category := strings.TrimSpace(c.Query("category"))

	var presets []models.ContentFilterPreset
	query := h.DB.Where("user_id = ?", userID).Order("category, name")
	if category != "" {
		query = query.Where("category = ?", category)
	}

	if err := query.Find(&presets).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch content filter presets", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "content filter presets", presets)
}

func (h *Handler) UpsertContentFilterPreset(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("user_id"))

	var req contentFilterPresetPayload
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	preset := models.ContentFilterPreset{
		UserID:     userID,
		Category:   strings.TrimSpace(req.Category),
		Name:       strings.TrimSpace(req.Name),
		FilterData: req.FilterData,
	}

	var existing models.ContentFilterPreset
	result := h.DB.Where("user_id = ? AND category = ? AND name = ?", userID, preset.Category, preset.Name).First(&existing)
	if result.Error != nil {
		if err := h.DB.Create(&preset).Error; err != nil {
			utils.JSON(c, http.StatusInternalServerError, "failed to save content filter preset", nil)
			return
		}
		utils.JSON(c, http.StatusOK, "content filter preset saved", preset)
		return
	}

	existing.FilterData = req.FilterData
	if err := h.DB.Save(&existing).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update content filter preset", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "content filter preset saved", existing)
}

func (h *Handler) DeleteContentFilterPreset(c *gin.Context) {
	userID := strings.TrimSpace(c.GetString("user_id"))
	presetID := c.Param("preset_id")

	if err := h.DB.Where("id = ? AND user_id = ?", presetID, userID).Delete(&models.ContentFilterPreset{}).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete content filter preset", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "content filter preset deleted", gin.H{"id": presetID})
}
