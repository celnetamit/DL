package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type createContentRequest struct {
	Type      string         `json:"type" binding:"required"`
	Title     string         `json:"title" binding:"required"`
	Status    string         `json:"status"`
	SourceURL string         `json:"source_url"`
	Metadata  datatypes.JSON `json:"metadata"`
}

func (h *Handler) ListContents(c *gin.Context) {
	contentType := c.Query("type")
	var contents []models.Content
	query := h.DB
	if contentType != "" {
		query = query.Where("type = ?", contentType)
	}

	if err := query.Order("created_at desc").Find(&contents).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load contents", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "contents", contents)
}

func (h *Handler) CreateContent(c *gin.Context) {
	var req createContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	content := models.Content{
		Type:     req.Type,
		Title:    req.Title,
		Status:   defaultString(req.Status, "Draft"),
		Metadata: req.Metadata,
	}
	if req.SourceURL != "" {
		content.SourceURL = &req.SourceURL
	}

	if err := h.DB.Create(&content).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create content", nil)
		return
	}

	h.syncContentProduct(content.ID)

	utils.JSON(c, http.StatusCreated, "content created", content)
}

type updateContentRequest struct {
	Type      string         `json:"type"`
	Title     string         `json:"title"`
	Status    string         `json:"status"`
	SourceURL string         `json:"source_url"`
	Metadata  datatypes.JSON `json:"metadata"`
}

func (h *Handler) UpdateContent(c *gin.Context) {
	contentID := c.Param("content_id")

	var req updateContentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Type != "" {
		updates["type"] = req.Type
	}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.SourceURL != "" {
		updates["source_url"] = req.SourceURL
	}
	if len(req.Metadata) > 0 {
		updates["metadata"] = req.Metadata
	}

	if len(updates) == 0 {
		utils.JSON(c, http.StatusBadRequest, "no updates provided", nil)
		return
	}

	if err := h.DB.Model(&models.Content{}).Where("id = ?", contentID).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update content", nil)
		return
	}

	h.syncContentProduct(contentID)

	utils.JSON(c, http.StatusOK, "content updated", gin.H{"id": contentID})
}

func (h *Handler) DeleteContent(c *gin.Context) {
	contentID := c.Param("content_id")

	if err := h.DB.Delete(&models.Content{}, "id = ?", contentID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete content", nil)
		return
	}

	h.DB.Delete(&models.Product{}, "content_id = ?", contentID)

	utils.JSON(c, http.StatusOK, "content deleted", gin.H{"id": contentID})
}

func (h *Handler) syncContentProduct(contentID string) error {
	// Content is no longer treated as a direct "Product".
	// We simply ensure no stray auto-generated product exists for this content.
	h.DB.Unscoped().Delete(&models.Product{}, "content_id = ?", contentID)
	return nil
}
