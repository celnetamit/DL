package handlers

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetAdminAnalytics(c *gin.Context) {
	months := 6
	if raw := c.Query("months"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed >= 1 && parsed <= 24 {
			months = parsed
		}
	}

	var totalUsers int64
	if err := h.DB.Model(&models.User{}).Count(&totalUsers).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to count users", nil)
		return
	}

	var activeSubscriptions int64
	if err := h.DB.Model(&models.Subscription{}).Where("status = ?", "active").Count(&activeSubscriptions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to count subscriptions", nil)
		return
	}

	var revenue struct {
		Total float64
	}
	if err := h.DB.Model(&models.Payment{}).Where("status = ?", "captured").Select("COALESCE(sum(amount), 0) as total").Scan(&revenue).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to sum revenue", nil)
		return
	}

	var totalInstitutions int64
	if err := h.DB.Model(&models.Institution{}).Count(&totalInstitutions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to count institutions", nil)
		return
	}

	startMonth := time.Now().UTC().AddDate(0, -(months - 1), 0)
	startMonth = time.Date(startMonth.Year(), startMonth.Month(), 1, 0, 0, 0, 0, time.UTC)

	var users []models.User
	if err := h.DB.Select("id, created_at").Where("created_at >= ?", startMonth).Find(&users).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load user growth data", nil)
		return
	}

	var institutions []models.Institution
	if err := h.DB.Select("id, created_at").Where("created_at >= ?", startMonth).Find(&institutions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load institution growth data", nil)
		return
	}

	var subscriptions []models.Subscription
	if err := h.DB.Select("id, status, created_at").Where("created_at >= ?", startMonth).Find(&subscriptions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load subscription trend data", nil)
		return
	}

	var payments []models.Payment
	if err := h.DB.Select("id, product_id, amount, status, created_at").Where("created_at >= ?", startMonth).Find(&payments).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load payment trend data", nil)
		return
	}

	var purchases []models.Purchase
	if err := h.DB.Select("id, product_id, access_status, payment_status, created_at").Where("created_at >= ?", startMonth).Find(&purchases).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load purchase trend data", nil)
		return
	}

	type monthlyPoint struct {
		Label               string  `json:"label"`
		Users               int     `json:"users"`
		Institutions        int     `json:"institutions"`
		NewSubscriptions    int     `json:"new_subscriptions"`
		ActiveSubscriptions int     `json:"active_subscriptions"`
		CapturedPayments    int     `json:"captured_payments"`
		Revenue             float64 `json:"revenue"`
	}

	points := make([]monthlyPoint, 0, months)
	monthIndex := make(map[string]int, months)
	for offset := 0; offset < months; offset++ {
		month := startMonth.AddDate(0, offset, 0)
		key := month.Format("2006-01")
		monthIndex[key] = len(points)
		points = append(points, monthlyPoint{Label: month.Format("Jan 2006")})
	}

	for _, user := range users {
		if idx, ok := monthIndex[user.CreatedAt.UTC().Format("2006-01")]; ok {
			points[idx].Users++
		}
	}
	for _, institution := range institutions {
		if idx, ok := monthIndex[institution.CreatedAt.UTC().Format("2006-01")]; ok {
			points[idx].Institutions++
		}
	}
	for _, sub := range subscriptions {
		if idx, ok := monthIndex[sub.CreatedAt.UTC().Format("2006-01")]; ok {
			points[idx].NewSubscriptions++
			if sub.Status == "active" {
				points[idx].ActiveSubscriptions++
			}
		}
	}
	for _, payment := range payments {
		if idx, ok := monthIndex[payment.CreatedAt.UTC().Format("2006-01")]; ok && payment.Status == "captured" {
			points[idx].CapturedPayments++
			points[idx].Revenue += float64(payment.Amount) / 100
		}
	}

	accessStatusBreakdown := map[string]int{}
	paymentStatusBreakdown := map[string]int{}
	productPurchaseCounts := map[string]int{}
	productIDs := make([]string, 0)
	seenProducts := map[string]struct{}{}
	for _, purchase := range purchases {
		accessStatusBreakdown[purchase.AccessStatus]++
		paymentStatusBreakdown[purchase.PaymentStatus]++
		if purchase.ProductID != nil && *purchase.ProductID != "" {
			productPurchaseCounts[*purchase.ProductID]++
			if _, exists := seenProducts[*purchase.ProductID]; !exists {
				seenProducts[*purchase.ProductID] = struct{}{}
				productIDs = append(productIDs, *purchase.ProductID)
			}
		}
	}

	productNames := map[string]string{}
	if len(productIDs) > 0 {
		var products []models.Product
		if err := h.DB.Select("id, name").Where("id IN ?", productIDs).Find(&products).Error; err != nil {
			utils.JSON(c, http.StatusInternalServerError, "failed to load product sales data", nil)
			return
		}
		for _, product := range products {
			productNames[product.ID] = product.Name
		}
	}

	type topProduct struct {
		ProductID      string `json:"product_id"`
		ProductName    string `json:"product_name"`
		PurchaseCount  int    `json:"purchase_count"`
	}

	topProducts := make([]topProduct, 0, len(productPurchaseCounts))
	for productID, count := range productPurchaseCounts {
		topProducts = append(topProducts, topProduct{
			ProductID:     productID,
			ProductName:   productNames[productID],
			PurchaseCount: count,
		})
	}
	sort.Slice(topProducts, func(i, j int) bool {
		if topProducts[i].PurchaseCount == topProducts[j].PurchaseCount {
			return topProducts[i].ProductName < topProducts[j].ProductName
		}
		return topProducts[i].PurchaseCount > topProducts[j].PurchaseCount
	})
	if len(topProducts) > 5 {
		topProducts = topProducts[:5]
	}

	utils.JSON(c, http.StatusOK, "analytics retrieved", gin.H{
		"total_users":          totalUsers,
		"total_institutions":   totalInstitutions,
		"active_subscriptions": activeSubscriptions,
		"total_revenue":        revenue.Total,
		"months":               months,
		"monthly_growth":       points,
		"purchase_access_breakdown": accessStatusBreakdown,
		"purchase_payment_breakdown": paymentStatusBreakdown,
		"top_products":         topProducts,
	})
}
