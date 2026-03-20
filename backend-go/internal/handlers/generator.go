package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

var aiHTTPClient = &http.Client{Timeout: 50 * time.Second}

type generateRequest struct {
	CourseID string `json:"course_id" binding:"required"`
	ModuleID string `json:"module_id" binding:"required"`
	URL      string `json:"url"`
	Text     string `json:"text"`
	Title    string `json:"title"`
}

type aiGenerateResponse struct {
	Title         string   `json:"title"`
	Summary       string   `json:"summary"`
	KeyPoints     []string `json:"key_points"`
	Flashcards    []any    `json:"flashcards"`
	Provider      string   `json:"provider"`
	Model         string   `json:"model"`
	PromptVersion string   `json:"prompt_version"`
	GeneratedAt   string   `json:"generated_at"`
}

func (h *Handler) GenerateMaterial(c *gin.Context) {
	userID := c.GetString("user_id")
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
	requestPayload := datatypes.JSON(body)

	// Call Python AI
	aiEndpoint := h.Config.AIEngineURL + "/api/v1/generate-course-material"
	httpReq, err := http.NewRequest(http.MethodPost, aiEndpoint, bytes.NewBuffer(body))
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to prepare ai request", gin.H{"error": err.Error()})
		return
	}
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := aiHTTPClient.Do(httpReq)
	if err != nil {
		h.recordAIGenerationFailure(userID, req, requestPayload, "", "", "", fmt.Sprintf("failed to reach ai engine: %v", err))
		utils.JSON(c, http.StatusBadGateway, "failed to reach ai engine", gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		errorBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
		detail := strings.TrimSpace(string(errorBody))
		if detail == "" {
			detail = "upstream ai engine returned an error"
		}
		h.recordAIGenerationFailure(userID, req, requestPayload, "", "", "", detail)
		utils.JSON(c, http.StatusBadGateway, "ai engine error", gin.H{"error": detail})
		return
	}

	var aiResult aiGenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&aiResult); err != nil {
		h.recordAIGenerationFailure(userID, req, requestPayload, "", "", "", fmt.Sprintf("failed to decode ai response: %v", err))
		utils.JSON(c, http.StatusInternalServerError, "failed to decode ai response", gin.H{"error": err.Error()})
		return
	}
	if err := validateAIResult(aiResult); err != nil {
		h.recordAIGenerationFailure(userID, req, requestPayload, aiResult.Provider, aiResult.Model, aiResult.PromptVersion, err.Error())
		utils.JSON(c, http.StatusBadGateway, "invalid ai response", gin.H{"error": err.Error()})
		return
	}

	responsePayload, _ := json.Marshal(aiResult)

	metadataBytes, _ := json.Marshal(map[string]interface{}{
		"summary":        aiResult.Summary,
		"key_points":     aiResult.KeyPoints,
		"flashcards":     aiResult.Flashcards,
		"ai_provider":    aiResult.Provider,
		"ai_model":       aiResult.Model,
		"prompt_version": aiResult.PromptVersion,
		"generated_at":   aiResult.GeneratedAt,
		"generation_source": map[string]interface{}{
			"url":       req.URL,
			"text_mode": req.Text != "",
			"title":     req.Title,
		},
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

	if err := h.persistGeneratedLessonAndAudit(userID, req, requestPayload, datatypes.JSON(responsePayload), aiResult, &lesson); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to save generated lesson", gin.H{"error": err.Error()})
		return
	}

	utils.JSON(c, http.StatusOK, "lesson generated", lesson)
}

func validateAIResult(result aiGenerateResponse) error {
	if strings.TrimSpace(result.Title) == "" {
		return fmt.Errorf("missing title")
	}
	if strings.TrimSpace(result.Summary) == "" {
		return fmt.Errorf("missing summary")
	}
	if len(result.KeyPoints) < 3 {
		return fmt.Errorf("insufficient key points")
	}
	if len(result.Flashcards) < 2 {
		return fmt.Errorf("insufficient flashcards")
	}
	return nil
}

func (h *Handler) ListAIGenerationLogs(c *gin.Context) {
	statusFilter := strings.TrimSpace(c.Query("status"))
	providerFilter := strings.TrimSpace(c.Query("provider"))
	modelFilter := strings.TrimSpace(c.Query("model"))
	moduleIDFilter := strings.TrimSpace(c.Query("module_id"))
	limit := 50
	if raw := strings.TrimSpace(c.Query("limit")); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 && parsed <= 200 {
			limit = parsed
		}
	}

	var logs []models.AIGenerationLog
	query := h.DB.Order("created_at desc").Limit(limit)
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if providerFilter != "" {
		query = query.Where("provider = ?", providerFilter)
	}
	if modelFilter != "" {
		query = query.Where("model = ?", modelFilter)
	}
	if moduleIDFilter != "" {
		query = query.Where("module_id = ?", moduleIDFilter)
	}

	if err := query.Find(&logs).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch ai generation logs", nil)
		return
	}

	type logRow struct {
		models.AIGenerationLog
		UserEmail   string `json:"user_email"`
		UserName    string `json:"user_name"`
		LessonTitle string `json:"lesson_title"`
		ModuleTitle string `json:"module_title"`
		CourseTitle string `json:"course_title"`
	}

	rows := make([]logRow, 0, len(logs))
	for _, entry := range logs {
		row := logRow{AIGenerationLog: entry}
		if entry.UserID != nil {
			var user models.User
			if err := h.DB.Select("email, full_name").First(&user, "id = ?", *entry.UserID).Error; err == nil {
				row.UserEmail = user.Email
				row.UserName = user.FullName
			}
		}
		if entry.LessonID != nil {
			var lesson models.Lesson
			if err := h.DB.Select("title").First(&lesson, "id = ?", *entry.LessonID).Error; err == nil {
				row.LessonTitle = lesson.Title
			}
		}
		var module models.Module
		if err := h.DB.Select("title").First(&module, "id = ?", entry.ModuleID).Error; err == nil {
			row.ModuleTitle = module.Title
		}
		var course models.Course
		if err := h.DB.Select("title").First(&course, "id = ?", entry.CourseID).Error; err == nil {
			row.CourseTitle = course.Title
		}
		rows = append(rows, row)
	}

	utils.JSON(c, http.StatusOK, "ai generation logs", rows)
}

func (h *Handler) persistGeneratedLessonAndAudit(userID string, req generateRequest, requestPayload, responsePayload datatypes.JSON, aiResult aiGenerateResponse, lesson *models.Lesson) error {
	return h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(lesson).Error; err != nil {
			return err
		}

		record := buildAIGenerationLog(userID, req, requestPayload, responsePayload, aiResult.Provider, aiResult.Model, aiResult.PromptVersion, "success", "", &lesson.ID)
		if err := tx.Create(&record).Error; err != nil {
			return err
		}
		return nil
	})
}

func (h *Handler) recordAIGenerationFailure(userID string, req generateRequest, requestPayload datatypes.JSON, provider, model, promptVersion, errorMessage string) {
	if h.DB == nil {
		return
	}
	record := buildAIGenerationLog(userID, req, requestPayload, datatypes.JSON([]byte(`{}`)), provider, model, promptVersion, "failed", errorMessage, nil)
	if err := h.DB.Create(&record).Error; err != nil {
		log.Printf("failed to record ai generation log: %v", err)
	}
}

func buildAIGenerationLog(userID string, req generateRequest, requestPayload, responsePayload datatypes.JSON, provider, model, promptVersion, status, errorMessage string, lessonID *string) models.AIGenerationLog {
	var userIDPtr *string
	if strings.TrimSpace(userID) != "" {
		userIDPtr = &userID
	}

	sourceType := "text"
	if strings.TrimSpace(req.URL) != "" {
		sourceType = "url"
	}

	record := models.AIGenerationLog{
		UserID:          userIDPtr,
		CourseID:        req.CourseID,
		ModuleID:        req.ModuleID,
		LessonID:        lessonID,
		Provider:        fallbackString(provider, "gemini"),
		Model:           fallbackString(model, "unknown"),
		PromptVersion:   fallbackString(promptVersion, "v1"),
		Status:          status,
		SourceType:      sourceType,
		RequestedTitle:  req.Title,
		ErrorMessage:    errorMessage,
		RequestPayload:  requestPayload,
		ResponsePayload: responsePayload,
	}
	if strings.TrimSpace(req.URL) != "" {
		record.SourceURL = &req.URL
	}
	return record
}

func fallbackString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
