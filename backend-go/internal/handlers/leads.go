package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type contactLeadRequest struct {
	FullName        string `json:"full_name" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Phone           string `json:"phone"`
	InstitutionName string `json:"institution_name"`
	Subject         string `json:"subject" binding:"required"`
	Message         string `json:"message" binding:"required"`
}

type purchaseLeadRequest struct {
	FullName        string `json:"full_name" binding:"required"`
	Email           string `json:"email" binding:"required,email"`
	Phone           string `json:"phone"`
	InstitutionName string `json:"institution_name"`
	Subject         string `json:"subject"`
	Message         string `json:"message"`
	ProductID       string `json:"product_id"`
	ProductName     string `json:"product_name"`
	PlanCode        string `json:"plan_code"`
	Amount          *int   `json:"amount"`
	Currency        string `json:"currency"`
}

func (h *Handler) SubmitContactLead(c *gin.Context) {
	var req contactLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	event := models.LeadEvent{
		LeadType:        "query",
		Source:          "contact_form",
		FullName:        strings.TrimSpace(req.FullName),
		Email:           strings.TrimSpace(strings.ToLower(req.Email)),
		Phone:           strings.TrimSpace(req.Phone),
		InstitutionName: strings.TrimSpace(req.InstitutionName),
		Subject:         strings.TrimSpace(req.Subject),
		Message:         strings.TrimSpace(req.Message),
		Currency:        "INR",
		SyncStatus:      "pending",
		Metadata:        mustLeadMetadata(map[string]interface{}{"channel": "contact_page"}),
	}

	statusCode, responseData := h.createAndSyncLead(event)
	utils.JSON(c, statusCode, "lead submitted", responseData)
}

func (h *Handler) SubmitPurchaseLead(c *gin.Context) {
	var req purchaseLeadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	event := models.LeadEvent{
		LeadType:        "purchase_request",
		Source:          "pricing_page",
		FullName:        strings.TrimSpace(req.FullName),
		Email:           strings.TrimSpace(strings.ToLower(req.Email)),
		Phone:           strings.TrimSpace(req.Phone),
		InstitutionName: strings.TrimSpace(req.InstitutionName),
		Subject:         firstNonEmpty(strings.TrimSpace(req.Subject), "Purchase Request"),
		Message:         strings.TrimSpace(req.Message),
		PlanCode:        strings.TrimSpace(req.PlanCode),
		ProductName:     strings.TrimSpace(req.ProductName),
		Amount:          req.Amount,
		Currency:        firstNonEmpty(strings.TrimSpace(req.Currency), "INR"),
		SyncStatus:      "pending",
		Metadata: mustLeadMetadata(map[string]interface{}{
			"channel":    "pricing_page",
			"product_id": strings.TrimSpace(req.ProductID),
		}),
	}
	if productID := strings.TrimSpace(req.ProductID); productID != "" {
		event.ProductID = &productID
	}

	statusCode, responseData := h.createAndSyncLead(event)
	utils.JSON(c, statusCode, "lead submitted", responseData)
}

func (h *Handler) createAndSyncLead(event models.LeadEvent) (int, gin.H) {
	if err := h.DB.Create(&event).Error; err != nil {
		return http.StatusInternalServerError, gin.H{"error": err.Error()}
	}

	now := time.Now().UTC()
	attempts := event.SyncAttemptCount + 1
	responseBody, err := h.LeadWebhook.Send(event)
	if err != nil {
		h.DB.Model(&models.LeadEvent{}).Where("id = ?", event.ID).Updates(map[string]interface{}{
			"sync_status":        "failed",
			"sync_attempt_count": attempts,
			"last_attempted_at":  now,
			"last_error":         truncateLeadError(err.Error()),
		})
		return http.StatusAccepted, gin.H{
			"lead_id":     event.ID,
			"sync_status": "failed",
		}
	}

	h.DB.Model(&models.LeadEvent{}).Where("id = ?", event.ID).Updates(map[string]interface{}{
		"sync_status":        "synced",
		"sync_attempt_count": attempts,
		"last_attempted_at":  now,
		"synced_at":          now,
		"last_error":         "",
		"metadata":           mergeLeadMetadata(event.Metadata, responseBody),
	})

	return http.StatusOK, gin.H{
		"lead_id":     event.ID,
		"sync_status": "synced",
	}
}

func mustLeadMetadata(payload map[string]interface{}) datatypes.JSON {
	data, _ := json.Marshal(payload)
	return datatypes.JSON(data)
}

func mergeLeadMetadata(existing datatypes.JSON, responseBody string) datatypes.JSON {
	payload := map[string]interface{}{}
	if len(existing) > 0 {
		_ = json.Unmarshal(existing, &payload)
	}
	if strings.TrimSpace(responseBody) != "" {
		payload["crm_response_preview"] = truncateLeadError(strings.TrimSpace(responseBody))
	}
	data, _ := json.Marshal(payload)
	return datatypes.JSON(data)
}

func truncateLeadError(value string) string {
	const max = 500
	if len(value) <= max {
		return value
	}
	return value[:max]
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
