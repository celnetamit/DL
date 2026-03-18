package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// ListAllSubscriptions - admin view with optional ?status= and ?user_id= filters
func (h *Handler) ListAllSubscriptions(c *gin.Context) {
	statusFilter := c.Query("status")
	userIDFilter := c.Query("user_id")

	var subs []models.Subscription
	query := h.DB.Order("created_at desc")

	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}
	if userIDFilter != "" {
		query = query.Where("user_id = ?", userIDFilter)
	}

	if err := query.Find(&subs).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch subscriptions", nil)
		return
	}

	// Enrich with user email
	type SubWithUser struct {
		models.Subscription
		UserEmail string `json:"user_email"`
		UserName  string `json:"user_name"`
	}
	enriched := make([]SubWithUser, 0, len(subs))
	for _, s := range subs {
		row := SubWithUser{Subscription: s}
		if s.UserID != nil {
			var u models.User
			if err := h.DB.Select("email, full_name").First(&u, "id = ?", *s.UserID).Error; err == nil {
				row.UserEmail = u.Email
				row.UserName = u.FullName
			}
		}
		enriched = append(enriched, row)
	}

	utils.JSON(c, http.StatusOK, "subscriptions", enriched)
}

// AdminListUsers - lightweight user list for admin dropdowns (id, email, full_name)
func (h *Handler) AdminListUsers(c *gin.Context) {
	var users []struct {
		ID       string `json:"id"`
		Email    string `json:"email"`
		FullName string `json:"full_name"`
	}
	if err := h.DB.Model(&models.User{}).Select("id, email, full_name").Order("full_name asc").Find(&users).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to list users", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "users", users)
}

// AdminCreateSubscription - admin manually creates a subscription record
func (h *Handler) AdminCreateSubscription(c *gin.Context) {
	var req struct {
		UserID                 string `json:"user_id"`
		InstitutionID          string `json:"institution_id"`
		ProductID              string `json:"product_id"`
		PlanCode               string `json:"plan_code" binding:"required"`
		Status                 string `json:"status"`
		RazorpaySubscriptionID string `json:"razorpay_subscription_id"`
		RazorpayCustomerID     string `json:"razorpay_customer_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	sub := models.Subscription{
		PlanCode: req.PlanCode,
		Status:   req.Status,
	}
	if sub.Status == "" {
		sub.Status = "active"
	}
	if req.UserID != "" {
		sub.UserID = &req.UserID
	}
	if req.InstitutionID != "" {
		sub.InstitutionID = &req.InstitutionID
	}
	if req.ProductID != "" {
		sub.ProductID = &req.ProductID
	}
	if req.RazorpaySubscriptionID != "" {
		sub.RazorpaySubscriptionID = &req.RazorpaySubscriptionID
	}
	if req.RazorpayCustomerID != "" {
		sub.RazorpayCustomerID = &req.RazorpayCustomerID
	}

	if err := h.DB.Create(&sub).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create subscription", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "subscription created", sub)
}

// AdminUpdateSubscription - admin patches a subscription's status/plan/product
func (h *Handler) AdminUpdateSubscription(c *gin.Context) {
	subID := c.Param("id")

	var req struct {
		PlanCode               string `json:"plan_code"`
		Status                 string `json:"status"`
		ProductID              string `json:"product_id"`
		RazorpaySubscriptionID string `json:"razorpay_subscription_id"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	var sub models.Subscription
	if err := h.DB.First(&sub, "id = ?", subID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "subscription not found", nil)
		return
	}

	updates := map[string]interface{}{}
	if req.PlanCode != "" {
		updates["plan_code"] = req.PlanCode
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.ProductID != "" {
		updates["product_id"] = req.ProductID
	}
	if req.RazorpaySubscriptionID != "" {
		updates["razorpay_subscription_id"] = req.RazorpaySubscriptionID
	}

	if err := h.DB.Model(&sub).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update subscription", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "subscription updated", sub)
}


// AdminDeleteSubscription - admin hard-deletes a subscription record
func (h *Handler) AdminDeleteSubscription(c *gin.Context) {
	subID := c.Param("id")
	if err := h.DB.Delete(&models.Subscription{}, "id = ?", subID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete subscription", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "subscription deleted", nil)
}
