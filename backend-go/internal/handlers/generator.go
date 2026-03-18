package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

type generateRequest struct {
	CourseID string `json:"course_id" binding:"required"`
	ModuleID string `json:"module_id" binding:"required"`
	URL      string `json:"url"`
	Text     string `json:"text"`
	Title    string `json:"title"`
}

func (h *Handler) GenerateMaterial(c *gin.Context) {
	var req generateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if req.URL == "" && req.Text == "" {
		utils.JSON(c, http.StatusBadRequest, "url or text is required", nil)
		return
	}

	// Prepare payload for Python AI
	aiPayload := map[string]interface{}{
		"url":           req.URL,
		"text":          req.Text,
		"title":         req.Title,
		"num_questions": 5,
	}
	body, _ := json.Marshal(aiPayload)

	// Call Python AI
	aiEndpoint := h.Config.AIEngineURL + "/api/v1/generate-course-material"
	resp, err := http.Post(aiEndpoint, "application/json", bytes.NewBuffer(body))
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to reach ai engine", gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		utils.JSON(c, resp.StatusCode, "ai engine error", nil)
		return
	}

	var aiResult struct {
		Title      string   `json:"title"`
		Summary    string   `json:"summary"`
		KeyPoints  []string `json:"key_points"`
		Flashcards []any    `json:"flashcards"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&aiResult); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to decode ai response", gin.H{"error": err.Error()})
		return
	}

	metadataBytes, _ := json.Marshal(map[string]interface{}{
		"summary":    aiResult.Summary,
		"key_points": aiResult.KeyPoints,
		"flashcards": aiResult.Flashcards,
	})

	// Create lesson
	lesson := models.Lesson{
		ModuleID:        req.ModuleID,
		Title:           aiResult.Title,
		ContentType:     "Article",
		Status:          "published",
		DurationSeconds: 600,
		SortOrder:       0,
		Metadata:        metadataBytes,
	}

	if err := h.DB.Create(&lesson).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to save generated lesson", gin.H{"error": err.Error()})
		return
	}

	utils.JSON(c, http.StatusOK, "lesson generated", lesson)
}
