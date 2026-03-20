package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
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
	if h.Notifier != nil {
		if err := h.Notifier.SendLeadAcknowledgement(context.Background(), event.FullName, event.Email, "Contact Form"); err != nil {
			log.Printf("failed to send contact acknowledgement email: %v", err)
		}
	}
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
	if h.Notifier != nil {
		if err := h.Notifier.SendLeadAcknowledgement(context.Background(), event.FullName, event.Email, "Purchase Request Form"); err != nil {
			log.Printf("failed to send purchase request acknowledgement email: %v", err)
		}
	}
	utils.JSON(c, statusCode, "lead submitted", responseData)
}

func (h *Handler) ListLeadEvents(c *gin.Context) {
	statusFilter := strings.TrimSpace(c.Query("status"))
	leadTypeFilter := strings.TrimSpace(c.Query("lead_type"))

	var events []models.LeadEvent
	query := h.DB.Order("created_at desc")
	if statusFilter != "" {
		query = query.Where("sync_status = ?", statusFilter)
	}
	if leadTypeFilter != "" {
		query = query.Where("lead_type = ?", leadTypeFilter)
	}

	if err := query.Find(&events).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch lead events", nil)
		return
	}

	type leadOverview struct {
		models.LeadEvent
		UserEmail       string `json:"user_email"`
		UserName        string `json:"user_name"`
		InstitutionName string `json:"institution_name"`
		ProductName     string `json:"product_name"`
	}

	enriched := make([]leadOverview, 0, len(events))
	for _, event := range events {
		row := leadOverview{LeadEvent: event}
		if event.UserID != nil {
			var user models.User
			if err := h.DB.Select("email, full_name").First(&user, "id = ?", *event.UserID).Error; err == nil {
				row.UserEmail = user.Email
				row.UserName = user.FullName
			}
		}
		if event.InstitutionID != nil && row.InstitutionName == "" {
			var institution models.Institution
			if err := h.DB.Select("name").First(&institution, "id = ?", *event.InstitutionID).Error; err == nil {
				row.InstitutionName = institution.Name
			}
		}
		if event.ProductID != nil && row.ProductName == "" {
			var product models.Product
			if err := h.DB.Select("name").First(&product, "id = ?", *event.ProductID).Error; err == nil {
				row.ProductName = product.Name
			}
		}
		enriched = append(enriched, row)
	}

	utils.JSON(c, http.StatusOK, "lead events", enriched)
}

func (h *Handler) RetryLeadEvent(c *gin.Context) {
	leadID := c.Param("id")

	var event models.LeadEvent
	if err := h.DB.First(&event, "id = ?", leadID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "lead event not found", nil)
		return
	}

	now := time.Now().UTC()
	attempts := event.SyncAttemptCount + 1
	responseBody, err := h.LeadWebhook.Send(event)
	if err != nil {
		errMessage := truncateLeadError(err.Error())
		h.DB.Model(&models.LeadEvent{}).Where("id = ?", event.ID).Updates(map[string]interface{}{
			"sync_status":        "failed",
			"sync_attempt_count": attempts,
			"last_attempted_at":  now,
			"last_error":         errMessage,
		})
		utils.JSON(c, http.StatusAccepted, "lead retry failed", gin.H{
			"lead_id":     event.ID,
			"sync_status": "failed",
			"error":       errMessage,
		})
		return
	}

	h.DB.Model(&models.LeadEvent{}).Where("id = ?", event.ID).Updates(map[string]interface{}{
		"sync_status":        "synced",
		"sync_attempt_count": attempts,
		"last_attempted_at":  now,
		"synced_at":          now,
		"last_error":         "",
		"metadata":           mergeLeadMetadata(event.Metadata, responseBody),
	})

	utils.JSON(c, http.StatusOK, "lead retried successfully", gin.H{
		"lead_id":     event.ID,
		"sync_status": "synced",
	})
}

func (h *Handler) SyncCheckoutLead(payment models.Payment) error {
	if payment.ID == "" {
		return nil
	}

	var existing models.LeadEvent
	if err := h.DB.Select("id").First(&existing, "payment_id = ?", payment.ID).Error; err == nil {
		return nil
	} else if err != gorm.ErrRecordNotFound {
		return err
	}

	event := models.LeadEvent{
		UserID:        payment.UserID,
		InstitutionID: payment.InstitutionID,
		ProductID:     payment.ProductID,
		PaymentID:     &payment.ID,
		LeadType:      "purchase",
		Source:        "checkout_success",
		FullName:      "Checkout Customer",
		Email:         "unknown@example.com",
		Subject:       "Successful Checkout",
		Message:       "A checkout was completed successfully.",
		PlanCode:      payment.PlanCode,
		Amount:        &payment.Amount,
		Currency:      firstNonEmpty(strings.TrimSpace(payment.Currency), "INR"),
		SyncStatus:    "pending",
		Metadata: mustLeadMetadata(map[string]interface{}{
			"channel":             "checkout_success",
			"payment_id":          payment.ID,
			"razorpay_order_id":   stringOrEmpty(payment.RazorpayOrderID),
			"razorpay_payment_id": stringOrEmpty(payment.RazorpayPaymentID),
		}),
	}

	if payment.UserID != nil {
		var user models.User
		if err := h.DB.Select("full_name, email, institution_id").First(&user, "id = ?", *payment.UserID).Error; err == nil {
			event.FullName = firstNonEmpty(strings.TrimSpace(user.FullName), event.FullName)
			event.Email = firstNonEmpty(strings.TrimSpace(strings.ToLower(user.Email)), event.Email)
			if payment.InstitutionID == nil && user.InstitutionID != nil {
				event.InstitutionID = user.InstitutionID
			}
		}
	}

	if event.InstitutionID != nil {
		var institution models.Institution
		if err := h.DB.Select("name").First(&institution, "id = ?", *event.InstitutionID).Error; err == nil {
			event.InstitutionName = strings.TrimSpace(institution.Name)
		}
	}

	if payment.ProductID != nil {
		var product models.Product
		if err := h.DB.Select("name").First(&product, "id = ?", *payment.ProductID).Error; err == nil {
			event.ProductName = strings.TrimSpace(product.Name)
			event.Subject = fmt.Sprintf("Successful Checkout for %s", product.Name)
			event.Message = fmt.Sprintf("A checkout was completed successfully for %s.", product.Name)
		}
	}

	if payment.Description != "" && event.ProductName == "" {
		event.ProductName = strings.TrimSpace(payment.Description)
		event.Subject = fmt.Sprintf("Successful Checkout for %s", event.ProductName)
		event.Message = fmt.Sprintf("A checkout was completed successfully for %s.", event.ProductName)
	}

	_, responseData := h.createAndSyncLead(event)
	if syncStatus, ok := responseData["sync_status"].(string); ok && syncStatus == "failed" {
		if errText, ok := responseData["error"].(string); ok && errText != "" {
			return fmt.Errorf("%s", errText)
		}
	}
	if h.Notifier != nil {
		if err := h.Notifier.SendCheckoutConfirmation(context.Background(), event.FullName, event.Email, event.ProductName); err != nil {
			log.Printf("failed to send checkout confirmation email: %v", err)
		}
	}
	return nil
}

func (h *Handler) createAndSyncLead(event models.LeadEvent) (int, gin.H) {
	if err := h.DB.Create(&event).Error; err != nil {
		return http.StatusInternalServerError, gin.H{"error": err.Error()}
	}

	now := time.Now().UTC()
	attempts := event.SyncAttemptCount + 1
	responseBody, err := h.LeadWebhook.Send(event)
	if err != nil {
		errMessage := truncateLeadError(err.Error())
		h.DB.Model(&models.LeadEvent{}).Where("id = ?", event.ID).Updates(map[string]interface{}{
			"sync_status":        "failed",
			"sync_attempt_count": attempts,
			"last_attempted_at":  now,
			"last_error":         errMessage,
		})
		if h.Notifier != nil {
			alertPayload := map[string]interface{}{
				"lead_id":      event.ID,
				"lead_type":    event.LeadType,
				"source":       event.Source,
				"email":        event.Email,
				"subject":      event.Subject,
				"error":        errMessage,
				"created_at":   event.CreatedAt,
				"app_base_url": h.Config.AppBaseURL,
			}
			if publishErr := h.Notifier.PublishAlert(context.Background(), "Lead sync failed", alertPayload); publishErr != nil {
				log.Printf("failed to publish lead sync alert: %v", publishErr)
			}
		}
		return http.StatusAccepted, gin.H{
			"lead_id":     event.ID,
			"sync_status": "failed",
			"error":       errMessage,
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

func stringOrEmpty(value *string) string {
	if value == nil {
		return ""
	}
	return *value
}
