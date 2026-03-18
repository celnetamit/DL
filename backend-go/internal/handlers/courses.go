package handlers

import (
	"net/http"
	"strings"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

var allowedDomains = map[string]string{
	"general":      "General",
	"engineering":  "Engineering",
	"nursing":      "Nursing",
	"medical":      "Medical",
	"law":          "Law",
	"pharmacy":     "Pharmacy",
	"architecture": "Architecture",
	"agriculture":  "Agriculture",
	"civil":        "Civil",
	"management":   "Management",
	"education":    "Education",
}

var allowedContentTypes = map[string]string{
	"ebook":       "E-Book",
	"ebookpdf":    "E-Book",
	"ebookdoc":    "E-Book",
	"thesis":      "Thesis",
	"journal":     "Journals",
	"journals":    "Journals",
	"emagazin":    "E-Magazins",
	"emagazine":   "E-Magazins",
	"emagazines":  "E-Magazins",
	"emagazins":   "E-Magazins",
	"video":       "Videos",
	"videos":      "Videos",
	"conference":  "Conference",
	"casestudies": "Casestudies",
	"newspaper":   "E-Newspaper",
	"enewspaper":  "E-Newspaper",
}

func (h *Handler) ListCourses(c *gin.Context) {
	var courses []models.Course
	if err := h.DB.Preload("Modules").Preload("Modules.Lessons").Find(&courses).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load courses", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "courses", courses)
}

func (h *Handler) GetCourse(c *gin.Context) {
	courseID := c.Param("course_id")
	var course models.Course

	if err := h.DB.Preload("Modules").Preload("Modules.Lessons").Where("id = ?", courseID).First(&course).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "course not found", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "course", course)
}

type createCourseRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Domain      string `json:"domain"`
	Subdomain   string `json:"subdomain"`
	Level       string `json:"level"`
}

func (h *Handler) CreateCourse(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req createCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	description := req.Description
	domain := defaultString(req.Domain, "General")
	canonicalDomain, ok := resolveDomain(domain)
	if !ok {
		utils.JSON(c, http.StatusBadRequest, "invalid domain", gin.H{"allowed": allowedDomainList()})
		return
	}
	var subdomain *string
	if req.Subdomain != "" {
		subdomain = &req.Subdomain
	}
	course := models.Course{
		Title:       req.Title,
		Description: &description,
		Domain:      canonicalDomain,
		Subdomain:   subdomain,
		AuthorID:    ptrString(userID.(string)),
		Level:       defaultString(req.Level, "beginner"),
		Status:      "draft",
	}

	if err := h.DB.Create(&course).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create course", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "course created", course)
}

type updateCourseRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Domain      string `json:"domain"`
	Subdomain   string `json:"subdomain"`
	Level       string `json:"level"`
	Status      string `json:"status"`
}

func (h *Handler) UpdateCourse(c *gin.Context) {
	courseID := c.Param("course_id")

	var req updateCourseRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.Domain != "" {
		canonicalDomain, ok := resolveDomain(req.Domain)
		if !ok {
			utils.JSON(c, http.StatusBadRequest, "invalid domain", gin.H{"allowed": allowedDomainList()})
			return
		}
		updates["domain"] = canonicalDomain
	}
	if req.Subdomain != "" {
		updates["subdomain"] = req.Subdomain
	}
	if req.Level != "" {
		updates["level"] = req.Level
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	if len(updates) == 0 {
		utils.JSON(c, http.StatusBadRequest, "no updates provided", nil)
		return
	}

	if err := h.DB.Model(&models.Course{}).Where("id = ?", courseID).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update course", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "course updated", gin.H{"id": courseID})
}

func (h *Handler) DeleteCourse(c *gin.Context) {
	courseID := c.Param("course_id")

	if err := h.DB.Delete(&models.Course{}, "id = ?", courseID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete course", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "course deleted", gin.H{"id": courseID})
}

type createModuleRequest struct {
	Title     string `json:"title" binding:"required"`
	Status    string `json:"status"`
	SortOrder int    `json:"sort_order"`
}

func (h *Handler) AddModule(c *gin.Context) {
	courseID := c.Param("course_id")

	var req createModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	module := models.Module{
		CourseID:  courseID,
		Title:     req.Title,
		Status:    defaultString(req.Status, "draft"),
		SortOrder: req.SortOrder,
	}

	if err := h.DB.Create(&module).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create module", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "module created", module)
}

type updateModuleRequest struct {
	Title     string `json:"title"`
	Status    string `json:"status"`
	SortOrder int    `json:"sort_order"`
}

func (h *Handler) UpdateModule(c *gin.Context) {
	moduleID := c.Param("module_id")

	var req updateModuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.SortOrder != 0 {
		updates["sort_order"] = req.SortOrder
	}

	if len(updates) == 0 {
		utils.JSON(c, http.StatusBadRequest, "no updates provided", nil)
		return
	}

	if err := h.DB.Model(&models.Module{}).Where("id = ?", moduleID).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update module", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "module updated", gin.H{"id": moduleID})
}

func (h *Handler) DeleteModule(c *gin.Context) {
	moduleID := c.Param("module_id")

	if err := h.DB.Delete(&models.Module{}, "id = ?", moduleID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete module", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "module deleted", gin.H{"id": moduleID})
}

type createLessonRequest struct {
	Title           string `json:"title" binding:"required"`
	ContentType     string `json:"content_type"`
	Status          string `json:"status"`
	SourceURL       string `json:"source_url"`
	ContentURL      string `json:"content_url"`
	DurationSeconds int    `json:"duration_seconds"`
	SortOrder       int    `json:"sort_order"`
}

func (h *Handler) AddLesson(c *gin.Context) {
	moduleID := c.Param("module_id")

	var req createLessonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	contentType := defaultString(req.ContentType, "Videos")
	canonicalContentType, ok := resolveContentType(contentType)
	if !ok {
		utils.JSON(c, http.StatusBadRequest, "invalid content type", gin.H{"allowed": allowedContentTypeList()})
		return
	}
	sourceURL := ""
	if req.SourceURL != "" {
		sourceURL = req.SourceURL
	} else if req.ContentURL != "" {
		sourceURL = req.ContentURL
	}
	if sourceURL == "" {
		utils.JSON(c, http.StatusBadRequest, "source_url is required", nil)
		return
	}
	lesson := models.Lesson{
		ModuleID:        moduleID,
		Title:           req.Title,
		ContentType:     canonicalContentType,
		Status:          defaultString(req.Status, "draft"),
		DurationSeconds: req.DurationSeconds,
		SortOrder:       req.SortOrder,
	}
	lesson.SourceURL = &sourceURL
	lesson.ContentURL = &sourceURL

	if err := h.DB.Create(&lesson).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create lesson", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "lesson created", lesson)
}

type updateLessonRequest struct {
	Title           string `json:"title"`
	ContentType     string `json:"content_type"`
	Status          string `json:"status"`
	SourceURL       string `json:"source_url"`
	ContentURL      string `json:"content_url"`
	DurationSeconds int    `json:"duration_seconds"`
	SortOrder       int    `json:"sort_order"`
}

func (h *Handler) UpdateLesson(c *gin.Context) {
	lessonID := c.Param("lesson_id")

	var req updateLessonRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.ContentType != "" {
		canonicalContentType, ok := resolveContentType(req.ContentType)
		if !ok {
			utils.JSON(c, http.StatusBadRequest, "invalid content type", gin.H{"allowed": allowedContentTypeList()})
			return
		}
		updates["content_type"] = canonicalContentType
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.SourceURL != "" {
		updates["source_url"] = req.SourceURL
		updates["content_url"] = req.SourceURL
	} else if req.ContentURL != "" {
		updates["source_url"] = req.ContentURL
		updates["content_url"] = req.ContentURL
	}
	if req.DurationSeconds != 0 {
		updates["duration_seconds"] = req.DurationSeconds
	}
	if req.SortOrder != 0 {
		updates["sort_order"] = req.SortOrder
	}

	if len(updates) == 0 {
		utils.JSON(c, http.StatusBadRequest, "no updates provided", nil)
		return
	}

	if err := h.DB.Model(&models.Lesson{}).Where("id = ?", lessonID).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update lesson", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "lesson updated", gin.H{"id": lessonID})
}

func (h *Handler) DeleteLesson(c *gin.Context) {
	lessonID := c.Param("lesson_id")

	if err := h.DB.Delete(&models.Lesson{}, "id = ?", lessonID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete lesson", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "lesson deleted", gin.H{"id": lessonID})
}

type progressUpdateRequest struct {
	LessonID            string `json:"lesson_id" binding:"required"`
	ProgressPercent     int    `json:"progress_percent" binding:"required"`
	LastPositionSeconds int    `json:"last_position_seconds"`
}

func (h *Handler) UpdateProgress(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req progressUpdateRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	progress := models.Progress{
		UserID:              userID.(string),
		LessonID:            req.LessonID,
		ProgressPercent:     req.ProgressPercent,
		LastPositionSeconds: req.LastPositionSeconds,
	}

	if err := h.DB.Where("user_id = ? AND lesson_id = ?", userID, req.LessonID).Assign(progress).FirstOrCreate(&progress).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update progress", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "progress updated", progress)
}

func (h *Handler) GetProgress(c *gin.Context) {
	userID, _ := c.Get("user_id")
	var progress []models.Progress
	if err := h.DB.Where("user_id = ?", userID).Find(&progress).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to get progress", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "progress", progress)
}

func defaultString(value, fallback string) string {
	if value == "" {
		return fallback
	}
	return value
}

func normalizeKey(value string) string {
	normalized := strings.TrimSpace(strings.ToLower(value))
	normalized = strings.NewReplacer(" ", "", "-", "", "_", "", ".", "").Replace(normalized)
	return normalized
}

func resolveDomain(value string) (string, bool) {
	normalized := normalizeKey(value)
	canonical, ok := allowedDomains[normalized]
	return canonical, ok
}

func resolveContentType(value string) (string, bool) {
	normalized := normalizeKey(value)
	canonical, ok := allowedContentTypes[normalized]
	return canonical, ok
}

func allowedDomainList() []string {
	return []string{
		"General",
		"Engineering",
		"Nursing",
		"Medical",
		"Law",
		"Pharmacy",
		"Architecture",
		"Agriculture",
		"Civil",
		"Management",
		"Education",
	}
}

func allowedContentTypeList() []string {
	return []string{
		"E-Book",
		"Thesis",
		"Journals",
		"E-Magazins",
		"Videos",
		"Conference",
		"Casestudies",
		"E-Newspaper",
	}
}

func ptrString(value string) *string {
	return &value
}
