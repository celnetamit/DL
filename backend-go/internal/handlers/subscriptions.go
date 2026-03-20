package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/services"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type createOrderRequest struct {
	PlanCode string `json:"plan_code" binding:"required"`
	Amount   int    `json:"amount" binding:"required"`
	Currency string `json:"currency"`
}

type createSubscriptionRequest struct {
	PlanID        string `json:"plan_id" binding:"required"`
	TotalCount    int    `json:"total_count" binding:"required"`
	CustomerID    string `json:"customer_id"`
	CustomerName  string `json:"customer_name"`
	CustomerEmail string `json:"customer_email"`
}

type verifyPaymentRequest struct {
	RazorpayPaymentID string `json:"razorpay_payment_id" binding:"required"`
	RazorpayOrderID   string `json:"razorpay_order_id" binding:"required"`
	RazorpaySignature string `json:"razorpay_signature" binding:"required"`
}

func (h *Handler) getRazorpay() services.RazorpayService {
	keyID := h.GetSettingValue("RAZORPAY_KEY_ID", h.Razorpay.KeyID)
	keySecret := h.GetSettingValue("RAZORPAY_KEY_SECRET", h.Razorpay.KeySecret)
	return services.RazorpayService{
		KeyID:     keyID,
		KeySecret: keySecret,
	}
}

func (h *Handler) CreateOrder(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	currency := req.Currency
	if currency == "" {
		currency = "INR"
	}

	razorpay := h.getRazorpay()
	order, err := razorpay.CreateOrder(req.Amount, currency, "lms_order")
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "failed to create order", gin.H{"error": err.Error()})
		return
	}

	uid := userID.(string)

	var user models.User
	h.DB.First(&user, "id = ?", uid)

	payment := models.Payment{
		UserID:      &uid,
		Amount:      req.Amount,
		Currency:    currency,
		Status:      "created",
		PlanCode:    req.PlanCode,
		Description: req.PlanCode,
	}
	if user.InstitutionID != nil {
		payment.InstitutionID = user.InstitutionID
	}
	var product models.Product
	if err := h.DB.First(&product, "id = ?", req.PlanCode).Error; err == nil {
		payment.ProductID = &product.ID
		payment.Description = product.Name
	}
	if orderID, ok := order["id"].(string); ok {
		payment.RazorpayOrderID = &orderID
	}

	h.DB.Create(&payment)

	purchase := models.Purchase{
		UserID:          payment.UserID,
		InstitutionID:   payment.InstitutionID,
		ProductID:       payment.ProductID,
		PaymentID:       &payment.ID,
		PlanCode:        payment.PlanCode,
		PurchaseType:    "one_time",
		AccessStatus:    "pending",
		PaymentStatus:   payment.Status,
		Amount:          payment.Amount,
		Currency:        payment.Currency,
		RazorpayOrderID: payment.RazorpayOrderID,
	}
	h.DB.Create(&purchase)

	utils.JSON(c, http.StatusOK, "order created", gin.H{"order": order, "payment": payment})
}

func (h *Handler) GetMySubscriptions(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to identify user", nil)
		return
	}

	var subs []models.Subscription
	query := h.DB.Where("user_id = ?", userID)
	if user.InstitutionID != nil {
		query = h.DB.Where("user_id = ? OR institution_id = ?", userID, user.InstitutionID)
	}

	if err := query.Find(&subs).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch subscriptions", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "subscriptions retrieved", subs)
}

func (h *Handler) GetMyPayments(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to identify user", nil)
		return
	}

	var payments []models.Payment
	query := h.DB.Order("created_at desc").Where("user_id = ?", userID)
	if user.InstitutionID != nil {
		query = h.DB.Order("created_at desc").Where("user_id = ? OR institution_id = ?", userID, user.InstitutionID)
	}

	if err := query.Find(&payments).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch payments", nil)
		return
	}

	type paymentOverview struct {
		models.Payment
		ProductName        string `json:"product_name"`
		ProductTier        string `json:"product_tier"`
		SubscriptionStatus string `json:"subscription_status"`
		PurchaseID         string `json:"purchase_id"`
		AccessStatus       string `json:"access_status"`
	}

	enriched := make([]paymentOverview, 0, len(payments))
	for _, payment := range payments {
		row := paymentOverview{Payment: payment}

		if payment.ProductID != nil {
			var product models.Product
			if err := h.DB.Select("name, tier").First(&product, "id = ?", *payment.ProductID).Error; err == nil {
				row.ProductName = product.Name
				row.ProductTier = product.Tier
			}
		}
		if payment.SubscriptionID != nil {
			var sub models.Subscription
			if err := h.DB.Select("status").First(&sub, "id = ?", *payment.SubscriptionID).Error; err == nil {
				row.SubscriptionStatus = sub.Status
			}
		}
		var purchase models.Purchase
		if err := h.DB.Select("id, access_status").First(&purchase, "payment_id = ?", payment.ID).Error; err == nil {
			row.PurchaseID = purchase.ID
			row.AccessStatus = purchase.AccessStatus
		}

		enriched = append(enriched, row)
	}

	utils.JSON(c, http.StatusOK, "payments retrieved", enriched)
}

func (h *Handler) GetMyPurchases(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var user models.User
	if err := h.DB.First(&user, "id = ?", userID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to identify user", nil)
		return
	}

	var purchases []models.Purchase
	query := h.DB.Order("created_at desc").Where("user_id = ?", userID)
	if user.InstitutionID != nil {
		query = h.DB.Order("created_at desc").Where("user_id = ? OR institution_id = ?", userID, user.InstitutionID)
	}

	if err := query.Find(&purchases).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch purchases", nil)
		return
	}

	type purchaseOverview struct {
		models.Purchase
		ProductName        string `json:"product_name"`
		ProductTier        string `json:"product_tier"`
		SubscriptionStatus string `json:"subscription_status"`
		UserEmail          string `json:"user_email"`
		InstitutionName    string `json:"institution_name"`
	}

	enriched := make([]purchaseOverview, 0, len(purchases))
	for _, purchase := range purchases {
		row := purchaseOverview{Purchase: purchase}
		if purchase.ProductID != nil {
			var product models.Product
			if err := h.DB.Select("name, tier").First(&product, "id = ?", *purchase.ProductID).Error; err == nil {
				row.ProductName = product.Name
				row.ProductTier = product.Tier
			}
		}
		if purchase.SubscriptionID != nil {
			var sub models.Subscription
			if err := h.DB.Select("status").First(&sub, "id = ?", *purchase.SubscriptionID).Error; err == nil {
				row.SubscriptionStatus = sub.Status
			}
		}
		if purchase.UserID != nil {
			var buyer models.User
			if err := h.DB.Select("email").First(&buyer, "id = ?", *purchase.UserID).Error; err == nil {
				row.UserEmail = buyer.Email
			}
		}
		if purchase.InstitutionID != nil {
			var institution models.Institution
			if err := h.DB.Select("name").First(&institution, "id = ?", *purchase.InstitutionID).Error; err == nil {
				row.InstitutionName = institution.Name
			}
		}
		enriched = append(enriched, row)
	}

	utils.JSON(c, http.StatusOK, "purchases retrieved", enriched)
}

func (h *Handler) VerifyOrderPayment(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req verifyPaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	razorpay := h.getRazorpay()
	if !services.VerifyPaymentSignature(req.RazorpayOrderID, req.RazorpayPaymentID, req.RazorpaySignature, razorpay.KeySecret) {
		utils.JSON(c, http.StatusUnauthorized, "invalid signature", nil)
		return
	}

	var payment models.Payment
	if err := h.DB.First(&payment, "razorpay_order_id = ?", req.RazorpayOrderID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "payment record not found", nil)
		return
	}

	uid := userID.(string)
	if payment.UserID != nil && *payment.UserID != uid {
		utils.JSON(c, http.StatusForbidden, "not authorized to verify this payment", nil)
		return
	}

	if err := h.activateEntitlementForPayment(&payment, req.RazorpayPaymentID, "captured"); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to provision access", gin.H{"error": err.Error()})
		return
	}

	response := gin.H{
		"payment":          payment,
		"lead_sync_status": "synced",
	}
	message := "payment verified and access activated"
	if err := h.SyncCheckoutLead(payment); err != nil {
		response["lead_sync_status"] = "failed"
		response["lead_sync_error"] = err.Error()
		message = "payment verified and access activated, but CRM lead sync failed"
	}

	utils.JSON(c, http.StatusOK, message, response)
}

func (h *Handler) CreateSubscription(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req createSubscriptionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	razorpay := h.getRazorpay()
	customerID := req.CustomerID
	if customerID == "" && req.CustomerEmail != "" {
		customer, err := razorpay.CreateCustomer(req.CustomerName, req.CustomerEmail)
		if err != nil {
			utils.JSON(c, http.StatusBadRequest, "failed to create customer", gin.H{"error": err.Error()})
			return
		}
		if id, ok := customer["id"].(string); ok {
			customerID = id
		}
	}

	subscription, err := razorpay.CreateSubscription(req.PlanID, req.TotalCount, customerID)
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "failed to create subscription", gin.H{"error": err.Error()})
		return
	}

	uid := userID.(string)
	sub := models.Subscription{
		UserID:   &uid,
		PlanCode: req.PlanID,
		Status:   "created",
	}
	if id, ok := subscription["id"].(string); ok {
		sub.RazorpaySubscriptionID = &id
	}
	if customerID != "" {
		sub.RazorpayCustomerID = &customerID
	}

	if err := h.DB.Create(&sub).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to store subscription", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "subscription created", gin.H{"subscription": subscription, "record": sub})
}

func (h *Handler) RazorpayWebhook(c *gin.Context) {
	signature := c.GetHeader("X-Razorpay-Signature")
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid payload", nil)
		return
	}

	if !services.VerifySignature(body, signature, h.Config.RazorpayWebhookSecret) {
		utils.JSON(c, http.StatusUnauthorized, "invalid signature", nil)
		return
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(body, &payload); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid payload", nil)
		return
	}

	event, _ := payload["event"].(string)

	switch event {
	case "payment.captured":
		h.handlePaymentEvent(payload, "captured")
	case "payment.failed":
		h.handlePaymentEvent(payload, "failed")
	case "subscription.cancelled":
		h.handleSubscriptionCancelled(payload)
	case "subscription.activated":
		h.handleSubscriptionActivated(payload)
	case "subscription.halted":
		h.handleSubscriptionHalted(payload)
	}

	utils.JSON(c, http.StatusOK, "webhook processed", gin.H{"event": event})
}

func (h *Handler) handlePaymentEvent(payload map[string]interface{}, status string) {
	entity, ok := getNestedMap(payload, "payload", "payment", "entity")
	if !ok {
		return
	}

	orderID, _ := entity["order_id"].(string)
	paymentID, _ := entity["id"].(string)
	subscriptionID, _ := entity["subscription_id"].(string)

	if orderID == "" {
		return
	}

	var payment models.Payment
	if err := h.DB.First(&payment, "razorpay_order_id = ?", orderID).Error; err == nil {
		if status == "captured" {
			if err := h.activateEntitlementForPayment(&payment, paymentID, status); err != nil {
				return
			}
		} else {
			updates := map[string]interface{}{
				"status":              status,
				"razorpay_payment_id": paymentID,
			}
			h.DB.Model(&models.Payment{}).Where("id = ?", payment.ID).Updates(updates)
			h.DB.Model(&models.Purchase{}).Where("payment_id = ?", payment.ID).Updates(map[string]interface{}{
				"payment_status":      status,
				"access_status":       "pending",
				"razorpay_payment_id": paymentID,
			})
		}
	}

	if subscriptionID != "" {
		update := map[string]interface{}{"status": "active"}
		if status == "failed" {
			update["status"] = "past_due"
		}
		h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(update)
	}
}

func (h *Handler) activateEntitlementForPayment(payment *models.Payment, paymentID string, paymentStatus string) error {
	updates := map[string]interface{}{
		"status": paymentStatus,
	}
	if paymentID != "" {
		updates["razorpay_payment_id"] = paymentID
	}

	return h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Payment{}).Where("id = ?", payment.ID).Updates(updates).Error; err != nil {
			return err
		}

		var refreshed models.Payment
		if err := tx.First(&refreshed, "id = ?", payment.ID).Error; err != nil {
			return err
		}

		var existingPurchase models.Purchase
		purchaseErr := tx.Where("payment_id = ?", refreshed.ID).First(&existingPurchase).Error
		if purchaseErr != nil && purchaseErr != gorm.ErrRecordNotFound {
			return purchaseErr
		}

		if shouldSkipEntitlementActivation(existingPurchase, purchaseErr) {
			if err := tx.Model(&models.Payment{}).Where("id = ?", refreshed.ID).Update("subscription_id", existingPurchase.SubscriptionID).Error; err != nil {
				return err
			}
			refreshed.SubscriptionID = existingPurchase.SubscriptionID
			*payment = refreshed
			return nil
		}

		sub, err := ensurePaymentSubscription(tx, &refreshed)
		if err != nil {
			return err
		}

		if err := tx.Model(&models.Payment{}).Where("id = ?", refreshed.ID).Update("subscription_id", sub.ID).Error; err != nil {
			return err
		}

		now := time.Now().UTC()
		purchaseUpdates := map[string]interface{}{
			"subscription_id":     sub.ID,
			"payment_status":      paymentStatus,
			"access_status":       "active",
			"razorpay_payment_id": paymentID,
		}
		if purchaseErr != nil || existingPurchase.ActivatedAt == nil {
			purchaseUpdates["activated_at"] = now
		}
		if err := tx.Model(&models.Purchase{}).Where("payment_id = ?", refreshed.ID).Updates(purchaseUpdates).Error; err != nil {
			return err
		}

		refreshed.SubscriptionID = &sub.ID
		*payment = refreshed
		return nil
	})
}

func shouldSkipEntitlementActivation(purchase models.Purchase, lookupErr error) bool {
	return lookupErr == nil && purchase.AccessStatus == "active" && purchase.SubscriptionID != nil && *purchase.SubscriptionID != ""
}

func ensurePaymentSubscription(tx *gorm.DB, payment *models.Payment) (*models.Subscription, error) {
	var sub models.Subscription
	query := tx.Where("plan_code = ?", payment.PlanCode)

	if payment.ProductID != nil {
		query = query.Where("product_id = ?", *payment.ProductID)
	} else {
		query = query.Where("product_id IS NULL")
	}

	if payment.UserID != nil {
		query = query.Where("user_id = ?", *payment.UserID)
	} else {
		query = query.Where("user_id IS NULL")
	}

	if payment.InstitutionID != nil {
		query = query.Where("institution_id = ?", *payment.InstitutionID)
	} else {
		query = query.Where("institution_id IS NULL")
	}

	err := query.Order("created_at desc").First(&sub).Error
	if err != nil && err != gorm.ErrRecordNotFound {
		return nil, err
	}

	if err == gorm.ErrRecordNotFound {
		sub = models.Subscription{
			UserID:        payment.UserID,
			InstitutionID: payment.InstitutionID,
			ProductID:     payment.ProductID,
			PlanCode:      payment.PlanCode,
			Status:        "active",
		}
		if err := tx.Create(&sub).Error; err != nil {
			return nil, err
		}
		return &sub, nil
	}

	sub.Status = "active"
	if err := tx.Save(&sub).Error; err != nil {
		return nil, err
	}

	return &sub, nil
}

func (h *Handler) handleSubscriptionCancelled(payload map[string]interface{}) {
	entity, ok := getNestedMap(payload, "payload", "subscription", "entity")
	if !ok {
		return
	}

	subscriptionID, _ := entity["id"].(string)
	cancelAt := time.Now().UTC()

	h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(map[string]interface{}{
		"status":    "cancelled",
		"cancel_at": cancelAt,
	})
}

func (h *Handler) handleSubscriptionActivated(payload map[string]interface{}) {
	entity, ok := getNestedMap(payload, "payload", "subscription", "entity")
	if !ok {
		return
	}

	subscriptionID, _ := entity["id"].(string)
	currentEnd := parseUnixTime(entity["current_end"])

	h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(map[string]interface{}{
		"status":             "active",
		"current_period_end": currentEnd,
	})
}

func (h *Handler) handleSubscriptionHalted(payload map[string]interface{}) {
	entity, ok := getNestedMap(payload, "payload", "subscription", "entity")
	if !ok {
		return
	}

	subscriptionID, _ := entity["id"].(string)
	h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(map[string]interface{}{
		"status": "halted",
	})
}

func parseUnixTime(value interface{}) *time.Time {
	switch v := value.(type) {
	case float64:
		t := time.Unix(int64(v), 0).UTC()
		return &t
	case int64:
		t := time.Unix(v, 0).UTC()
		return &t
	default:
		return nil
	}
}

func getNestedMap(source map[string]interface{}, keys ...string) (map[string]interface{}, bool) {
	current := source
	for _, key := range keys {
		next, ok := current[key].(map[string]interface{})
		if !ok {
			return nil, false
		}
		current = next
	}
	return current, true
}

func (h *Handler) CancelSubscription(c *gin.Context) {
	subID := c.Param("id")
	userID, _ := c.Get("user_id")

	var sub models.Subscription
	if err := h.DB.First(&sub, "id = ?", subID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "subscription not found", nil)
		return
	}

	uid := userID.(string)
	// Ensure user owns this subscription or is associated via institution
	if sub.UserID != nil && *sub.UserID != uid {
		utils.JSON(c, http.StatusForbidden, "not authorized to cancel this subscription", nil)
		return
	}

	if sub.RazorpaySubscriptionID != nil && *sub.RazorpaySubscriptionID != "" {
		// Only call Razorpay if it was actually created there
		razorpay := h.getRazorpay()
		if _, err := razorpay.CancelSubscription(*sub.RazorpaySubscriptionID); err != nil {
			utils.JSON(c, http.StatusInternalServerError, "failed to cancel razorpay subscription", gin.H{"error": err.Error()})
			return
		}
	}

	sub.Status = "cancelled"
	if err := h.DB.Save(&sub).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to mark subscription as cancelled", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "subscription cancelled", sub)
}
