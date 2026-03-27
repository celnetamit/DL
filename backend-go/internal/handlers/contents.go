package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

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

type contentImportRowResult struct {
	Row     int    `json:"row"`
	Action  string `json:"action"`
	ID      string `json:"id,omitempty"`
	Title   string `json:"title,omitempty"`
	Status  string `json:"status,omitempty"`
	Message string `json:"message,omitempty"`
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

func (h *Handler) ImportContents(c *gin.Context) {
	contentType := strings.TrimSpace(c.PostForm("type"))
	if contentType == "" {
		utils.JSON(c, http.StatusBadRequest, "content type is required", nil)
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "csv file is required", nil)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	reader.FieldsPerRecord = -1
	records, err := reader.ReadAll()
	if err != nil && err != io.EOF {
		utils.JSON(c, http.StatusBadRequest, "failed to parse csv", gin.H{"error": err.Error()})
		return
	}
	if len(records) < 2 {
		utils.JSON(c, http.StatusBadRequest, "csv must contain a header row and at least one data row", nil)
		return
	}

	headers := sanitizeCSVHeaders(records[0])
	imported := 0
	updated := 0
	failed := 0
	rowResults := make([]contentImportRowResult, 0, len(records)-1)

	for i, row := range records[1:] {
		rowNumber := i + 2
		rowData := csvRowToMap(headers, row)
		contentID := firstNonBlankCSV(rowData["id"], rowData["@id"])
		title := strings.TrimSpace(rowData["title"])
		status := defaultString(strings.TrimSpace(rowData["status"]), "Draft")
		sourceURL := strings.TrimSpace(rowData["source_url"])

		if title == "" {
			title = "Imported Record"
		}

		delete(rowData, "id")
		delete(rowData, "@id")
		delete(rowData, "title")
		delete(rowData, "status")
		delete(rowData, "source_url")

		metadataMap := make(map[string]string)
		for key, value := range rowData {
			if strings.TrimSpace(key) == "" {
				continue
			}
			metadataMap[key] = strings.TrimSpace(value)
		}

		metadata, err := json.Marshal(metadataMap)
		if err != nil {
			failed++
			rowResults = append(rowResults, contentImportRowResult{
				Row:     rowNumber,
				Action:  "failed",
				Title:   title,
				Status:  status,
				Message: "failed to encode metadata payload",
			})
			continue
		}

		payload := models.Content{
			Type:     contentType,
			Title:    title,
			Status:   status,
			Metadata: metadata,
		}
		if sourceURL != "" {
			payload.SourceURL = &sourceURL
		}

		if contentID != "" {
			var existing models.Content
			if err := h.DB.First(&existing, "id = ?", contentID).Error; err == nil {
				updates := map[string]any{
					"type":     contentType,
					"title":    title,
					"status":   status,
					"metadata": metadata,
				}
				if sourceURL != "" {
					updates["source_url"] = sourceURL
				} else {
					updates["source_url"] = nil
				}
				if err := h.DB.Model(&models.Content{}).Where("id = ?", contentID).Updates(updates).Error; err != nil {
					failed++
					rowResults = append(rowResults, contentImportRowResult{
						Row:     rowNumber,
						Action:  "failed",
						ID:      contentID,
						Title:   title,
						Status:  status,
						Message: fmt.Sprintf("update failed: %v", err),
					})
					continue
				}
				_ = h.syncContentProduct(contentID)
				updated++
				rowResults = append(rowResults, contentImportRowResult{
					Row:     rowNumber,
					Action:  "updated",
					ID:      contentID,
					Title:   title,
					Status:  status,
					Message: "record updated",
				})
				continue
			}
		}

		if err := h.DB.Create(&payload).Error; err != nil {
			failed++
			rowResults = append(rowResults, contentImportRowResult{
				Row:     rowNumber,
				Action:  "failed",
				Title:   title,
				Status:  status,
				Message: fmt.Sprintf("create failed: %v", err),
			})
			continue
		}
		_ = h.syncContentProduct(payload.ID)
		imported++
		rowResults = append(rowResults, contentImportRowResult{
			Row:     rowNumber,
			Action:  "created",
			ID:      payload.ID,
			Title:   title,
			Status:  status,
			Message: "record created",
		})
	}

	utils.JSON(c, http.StatusOK, "content import complete", gin.H{
		"type":            contentType,
		"total_rows":      len(records) - 1,
		"created_count":   imported,
		"updated_count":   updated,
		"failed_count":    failed,
		"processed_count": imported + updated,
		"rows":            rowResults,
	})
}

func (h *Handler) syncContentProduct(contentID string) error {
	// Content is no longer treated as a direct "Product".
	// We simply ensure no stray auto-generated product exists for this content.
	h.DB.Unscoped().Delete(&models.Product{}, "content_id = ?", contentID)
	h.syncContentDomainLinks(contentID)
	return nil
}

func (h *Handler) syncContentDomainLinks(contentID string) error {
	var content models.Content
	if err := h.DB.First(&content, "id = ?", contentID).Error; err != nil {
		return err
	}

	if err := h.DB.Where("content_id = ?", contentID).Delete(&models.ContentDomainLink{}).Error; err != nil {
		return err
	}

	if len(content.Metadata) == 0 {
		return nil
	}

	var metadata map[string]any
	if err := json.Unmarshal(content.Metadata, &metadata); err != nil {
		return nil
	}

	domainName := normalizeMetadataText(metadata["domain"])
	if domainName == "" {
		return nil
	}

	var domain models.Domain
	if err := h.DB.Where("LOWER(name) = ?", strings.ToLower(domainName)).First(&domain).Error; err != nil {
		return nil
	}

	var subdomainID *string
	subdomainName := normalizeMetadataText(metadata["subdomain"])
	if subdomainName != "" {
		var subdomain models.Subdomain
		if err := h.DB.Where("domain_id = ? AND LOWER(name) = ?", domain.ID, strings.ToLower(subdomainName)).First(&subdomain).Error; err == nil {
			subdomainID = &subdomain.ID
		}
	}

	link := models.ContentDomainLink{
		ContentID:   contentID,
		DomainID:    domain.ID,
		SubdomainID: subdomainID,
	}
	return h.DB.Create(&link).Error
}

func normalizeMetadataText(value any) string {
	text, ok := value.(string)
	if !ok {
		return ""
	}
	return strings.TrimSpace(text)
}

func sanitizeCSVHeaders(headers []string) []string {
	result := make([]string, 0, len(headers))
	for _, header := range headers {
		result = append(result, strings.TrimSpace(strings.TrimPrefix(header, "\uFEFF")))
	}
	return result
}

func csvRowToMap(headers, row []string) map[string]string {
	mapped := make(map[string]string, len(headers))
	for idx, header := range headers {
		if header == "" {
			continue
		}
		value := ""
		if idx < len(row) {
			value = strings.TrimSpace(row[idx])
		}
		if _, exists := mapped[header]; !exists || value != "" {
			mapped[header] = value
		}
	}
	return mapped
}

func firstNonBlankCSV(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}
