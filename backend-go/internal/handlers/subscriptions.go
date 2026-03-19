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
  payment := models.Payment{
    UserID: &uid,
    Amount: req.Amount,
    Currency: currency,
    Status: "created",
  }
  if orderID, ok := order["id"].(string); ok {
    payment.RazorpayOrderID = &orderID
  }

  h.DB.Create(&payment)

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

  h.DB.Model(&models.Payment{}).Where("razorpay_order_id = ?", orderID).Updates(map[string]interface{}{
    "status": status,
    "razorpay_payment_id": paymentID,
  })

  if subscriptionID != "" {
    update := map[string]interface{}{"status": "active"}
    if status == "failed" {
      update["status"] = "past_due"
    }
    h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(update)
  }
}

func (h *Handler) handleSubscriptionCancelled(payload map[string]interface{}) {
  entity, ok := getNestedMap(payload, "payload", "subscription", "entity")
  if !ok {
    return
  }

  subscriptionID, _ := entity["id"].(string)
  cancelAt := time.Now().UTC()

  h.DB.Model(&models.Subscription{}).Where("razorpay_subscription_id = ?", subscriptionID).Updates(map[string]interface{}{
    "status":   "cancelled",
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
    "status": "active",
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
