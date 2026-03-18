package handlers

import (
  "net/http"
  "time"

  "lms-backend/internal/models"
  "lms-backend/internal/utils"

  "github.com/gin-gonic/gin"
)

func (h *Handler) InactiveUsers(c *gin.Context) {
  cutoff := time.Now().AddDate(0, 0, -14)
  var users []models.User
  if err := h.DB.Where("last_active_at IS NULL OR last_active_at < ?", cutoff).Find(&users).Error; err != nil {
    utils.JSON(c, http.StatusInternalServerError, "failed to load users", nil)
    return
  }

  utils.JSON(c, http.StatusOK, "inactive users", gin.H{"cutoff": cutoff, "users": users})
}

func (h *Handler) ChurnRisk(c *gin.Context) {
  userID := c.Param("user_id")

  var user models.User
  if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
    utils.JSON(c, http.StatusNotFound, "user not found", nil)
    return
  }

  risk := "low"
  if user.LastActiveAt == nil {
    risk = "high"
  } else if time.Since(*user.LastActiveAt) > (21 * 24 * time.Hour) {
    risk = "high"
  } else if time.Since(*user.LastActiveAt) > (7 * 24 * time.Hour) {
    risk = "medium"
  }

  utils.JSON(c, http.StatusOK, "churn risk", gin.H{"user_id": userID, "risk": risk})
}
