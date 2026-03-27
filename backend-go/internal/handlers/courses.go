package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/authz"
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
	query := h.DB.Preload("Modules").Preload("Modules.Lessons")
	if productID := strings.TrimSpace(c.Query("product_id")); productID != "" {
		query = query.Where("product_id = ?", productID)
	}
	if err := query.Find(&courses).Error; err != nil {
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

	if allowed, reason := h.canAccessCourse(c, course); !allowed {
		utils.JSON(c, http.StatusForbidden, reason, gin.H{
			"course_id":         course.ID,
			"product_id":        course.ProductID,
			"requires_purchase": course.ProductID != nil && *course.ProductID != "",
		})
		return
	}

	userID := strings.TrimSpace(c.GetString("user_id"))
	if userID != "" {
		var award models.CourseAward
		if err := h.DB.Where("user_id = ? AND course_id = ?", userID, course.ID).First(&award).Error; err == nil {
			course.Award = &award
		}
	}

	utils.JSON(c, http.StatusOK, "course", course)
}

type createCourseRequest struct {
	Title       string `json:"title" binding:"required"`
	Description string `json:"description"`
	Domain      string `json:"domain"`
	Subdomain   string `json:"subdomain"`
	Level       string `json:"level"`
	ProductID   string `json:"product_id"`
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
	if strings.TrimSpace(req.ProductID) != "" {
		var product models.Product
		if err := h.DB.Select("id").First(&product, "id = ?", req.ProductID).Error; err != nil {
			utils.JSON(c, http.StatusBadRequest, "invalid product_id", nil)
			return
		}
		course.ProductID = ptrString(req.ProductID)
	}

	if err := h.DB.Create(&course).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create course", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "course created", course)
}

type updateCourseRequest struct {
	Title       string  `json:"title"`
	Description string  `json:"description"`
	Domain      string  `json:"domain"`
	Subdomain   string  `json:"subdomain"`
	Level       string  `json:"level"`
	Status      string  `json:"status"`
	ProductID   *string `json:"product_id"`
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
	if req.ProductID != nil {
		if strings.TrimSpace(*req.ProductID) == "" {
			updates["product_id"] = nil
		} else {
			var product models.Product
			if err := h.DB.Select("id").First(&product, "id = ?", *req.ProductID).Error; err != nil {
				utils.JSON(c, http.StatusBadRequest, "invalid product_id", nil)
				return
			}
			updates["product_id"] = strings.TrimSpace(*req.ProductID)
		}
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

func (h *Handler) canAccessCourse(c *gin.Context, course models.Course) (bool, string) {
	rolesValue, _ := c.Get("roles")
	roles := authz.NormalizeRoleClaims(rolesValue)
	if authz.HasAnyRole(roles, authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin, authz.RoleSubscriptionManager) {
		return true, ""
	}

	if course.ProductID == nil || strings.TrimSpace(*course.ProductID) == "" {
		return true, ""
	}

	userID := c.GetString("user_id")
	if strings.TrimSpace(userID) == "" {
		return false, "course access requires authentication"
	}

	var user models.User
	if err := h.DB.Select("id, institution_id").First(&user, "id = ?", userID).Error; err != nil {
		return false, "failed to identify user"
	}

	var purchaseCount int64
	purchaseQuery := h.DB.Model(&models.Purchase{}).
		Where("product_id = ? AND access_status = ?", *course.ProductID, "active").
		Where("user_id = ?", userID)
	if user.InstitutionID != nil && strings.TrimSpace(*user.InstitutionID) != "" {
		purchaseQuery = purchaseQuery.Or("product_id = ? AND access_status = ? AND institution_id = ?", *course.ProductID, "active", *user.InstitutionID)
	}
	if err := purchaseQuery.Count(&purchaseCount).Error; err == nil && purchaseCount > 0 {
		return true, ""
	}

	var subscriptionCount int64
	subscriptionQuery := h.DB.Model(&models.Subscription{}).
		Where("product_id = ? AND status = ?", *course.ProductID, "active").
		Where("user_id = ?", userID)
	if user.InstitutionID != nil && strings.TrimSpace(*user.InstitutionID) != "" {
		subscriptionQuery = subscriptionQuery.Or("product_id = ? AND status = ? AND institution_id = ?", *course.ProductID, "active", *user.InstitutionID)
	}
	if err := subscriptionQuery.Count(&subscriptionCount).Error; err == nil && subscriptionCount > 0 {
		return true, ""
	}

	return false, "course access requires an active purchase or subscription for the linked product"
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
	if req.ProgressPercent >= 100 {
		now := time.Now().UTC()
		progress.CompletedAt = &now
	}

	if err := h.DB.Where("user_id = ? AND lesson_id = ?", userID, req.LessonID).Assign(progress).FirstOrCreate(&progress).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update progress", nil)
		return
	}

	award, err := h.issueCourseAwardIfEligible(userID.(string), req.LessonID)
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to evaluate course completion", nil)
		return
	}

	response := gin.H{"progress": progress}
	if award != nil {
		response["award"] = award
	}

	utils.JSON(c, http.StatusOK, "progress updated", response)
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

func (h *Handler) issueCourseAwardIfEligible(userID, lessonID string) (*models.CourseAward, error) {
	courseID, totalLessons, err := h.courseSummaryForLesson(lessonID)
	if err != nil {
		return nil, err
	}
	if courseID == "" || totalLessons == 0 {
		return nil, nil
	}

	var completedLessons int64
	if err := h.DB.
		Table("progress").
		Joins("JOIN lessons ON lessons.id = progress.lesson_id").
		Joins("JOIN modules ON modules.id = lessons.module_id").
		Where("progress.user_id = ? AND modules.course_id = ? AND progress.progress_percent >= 100", userID, courseID).
		Distinct("progress.lesson_id").
		Count(&completedLessons).Error; err != nil {
		return nil, err
	}

	if completedLessons < totalLessons {
		return nil, nil
	}

	var award models.CourseAward
	if err := h.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&award).Error; err == nil {
		return &award, nil
	}

	award = models.CourseAward{
		UserID:          userID,
		CourseID:        courseID,
		BadgeSlug:       "course-complete",
		BadgeLabel:      "Course Complete",
		CertificateCode: generateCertificateCode(),
		IssuedAt:        time.Now().UTC(),
	}
	if err := h.DB.Create(&award).Error; err != nil {
		if err := h.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&award).Error; err == nil {
			return &award, nil
		}
		return nil, err
	}

	return &award, nil
}

func (h *Handler) courseSummaryForLesson(lessonID string) (string, int64, error) {
	type result struct {
		CourseID     string
		TotalLessons int64
	}

	var row result
	err := h.DB.
		Table("lessons").
		Select("modules.course_id AS course_id, counts.total_lessons").
		Joins("JOIN modules ON modules.id = lessons.module_id").
		Joins("JOIN (SELECT modules.course_id, COUNT(lessons.id) AS total_lessons FROM modules JOIN lessons ON lessons.module_id = modules.id GROUP BY modules.course_id) AS counts ON counts.course_id = modules.course_id").
		Where("lessons.id = ?", lessonID).
		Scan(&row).Error
	if err != nil {
		return "", 0, err
	}

	return row.CourseID, row.TotalLessons, nil
}

func generateCertificateCode() string {
	buf := make([]byte, 4)
	if _, err := rand.Read(buf); err != nil {
		return "DL-" + time.Now().UTC().Format("20060102-150405")
	}
	return "DL-" + time.Now().UTC().Format("20060102") + "-" + strings.ToUpper(hex.EncodeToString(buf))
}
