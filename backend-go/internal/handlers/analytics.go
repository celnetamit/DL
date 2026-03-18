package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetAdminAnalytics(c *gin.Context) {
	var totalUsers int64
	if err := h.DB.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to count users", nil)
		return
	}

	var activeSubscriptions int64
	if err := h.DB.Model(&models.Subscription{}).Where("status = ?", "active").Count(&activeSubscriptions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to count subscriptions", nil)
		return
	}

	var revenue struct {
		Total float64
	}
	if err := h.DB.Model(&models.Payment{}).Where("status = ?", "captured").Select("COALESCE(sum(amount), 0) as total").Scan(&revenue).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to sum revenue", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "analytics retrieved", gin.H{
		"total_users":          totalUsers,
		"active_subscriptions": activeSubscriptions,
		"total_revenue":        revenue.Total,
	})
}
