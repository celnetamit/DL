package handlers

import (
  "net/http"

  "lms-backend/internal/models"
  "lms-backend/internal/utils"

  "github.com/gin-gonic/gin"
)

type updateProfileRequest struct {
  FullName string `json:"full_name" binding:"required"`
}

func (h *Handler) GetMe(c *gin.Context) {
  userID, _ := c.Get("user_id")

  var user models.User
  if err := h.DB.Preload("Roles").First(&user, "id = ?", userID).Error; err != nil {
    utils.JSON(c, http.StatusNotFound, "user not found", nil)
    return
  }

  utils.JSON(c, http.StatusOK, "profile", user)
}

func (h *Handler) UpdateMe(c *gin.Context) {
  userID, _ := c.Get("user_id")

  var req updateProfileRequest
  if err := c.ShouldBindJSON(&req); err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
    return
  }

  if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("full_name", req.FullName).Error; err != nil {
    utils.JSON(c, http.StatusInternalServerError, "failed to update profile", nil)
    return
  }

  utils.JSON(c, http.StatusOK, "profile updated", gin.H{"full_name": req.FullName})
}

// ── Admin: User Management ────────────────────────────────────────────────────

// GET /users?role=student&status=active&institution_id=<uuid>
func (h *Handler) ListUsers(c *gin.Context) {
  role           := c.Query("role")
  status         := c.Query("status")
  institutionID  := c.Query("institution_id")

  query := h.DB.Preload("Roles").Preload("Institution")

  if role != "" {
    query = query.Joins("JOIN user_roles ur ON ur.user_id = users.id JOIN roles r ON r.id = ur.role_id").
      Where("r.name = ?", role)
  }
  if status != "" {
    query = query.Where("status = ?", status)
  }
  if institutionID != "" {
    query = query.Where("institution_id = ?", institutionID)
  }

  var users []models.User
  if err := query.Find(&users).Error; err != nil {
    utils.JSON(c, http.StatusInternalServerError, "failed to list users", nil)
    return
  }
  utils.JSON(c, http.StatusOK, "users", users)
}

// PUT /users/:id/role    body: {"role":"instructor"}
func (h *Handler) UpdateUserRole(c *gin.Context) {
  userID := c.Param("id")

  var req struct {
    Role string `json:"role" binding:"required"`
  }
  if err := c.ShouldBindJSON(&req); err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
    return
  }

  var user models.User
  if err := h.DB.Preload("Roles").First(&user, "id = ?", userID).Error; err != nil {
    utils.JSON(c, http.StatusNotFound, "user not found", nil)
    return
  }

  var role models.Role
  if err := h.DB.Where("name = ?", req.Role).First(&role).Error; err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid role", nil)
    return
  }

  // Replace all roles with the single new one
  h.DB.Model(&user).Association("Roles").Replace(&role)
  utils.JSON(c, http.StatusOK, "role updated", gin.H{"user_id": userID, "role": req.Role})
}

// PUT /users/:id/status  body: {"status":"active"} or {"status":"inactive"}
func (h *Handler) UpdateUserStatus(c *gin.Context) {
  userID := c.Param("id")

  var req struct {
    Status string `json:"status" binding:"required,oneof=active inactive"`
  }
  if err := c.ShouldBindJSON(&req); err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
    return
  }

  if err := h.DB.Model(&models.User{}).Where("id = ?", userID).Update("status", req.Status).Error; err != nil {
    utils.JSON(c, http.StatusInternalServerError, "failed to update status", nil)
    return
  }

  utils.JSON(c, http.StatusOK, "status updated", gin.H{"user_id": userID, "status": req.Status})
}

