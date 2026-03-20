package handlers

import (
	"encoding/csv"
	"net/http"
	"sort"
	"strings"
	"time"

	"lms-backend/internal/authz"
	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GET /institutions – list all institutions
func (h *Handler) ListInstitutions(c *gin.Context) {
	var institutions []models.Institution
	if err := h.DB.Find(&institutions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to list institutions", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "institutions", institutions)
}

// POST /institutions – create a new institution
func (h *Handler) CreateInstitution(c *gin.Context) {
	var req struct {
		Name         string `json:"name" binding:"required"`
		Domain       string `json:"domain"`
		Code         string `json:"code"`
		Status       string `json:"status"`
		StudentLimit int    `json:"student_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if req.Status == "" {
		req.Status = "active"
	}

	inst := models.Institution{
		Name:         req.Name,
		Domain:       req.Domain,
		Code:         req.Code,
		Status:       req.Status,
		StudentLimit: req.StudentLimit,
	}
	if err := h.DB.Create(&inst).Error; err != nil {
		utils.JSON(c, http.StatusConflict, "failed to create institution (code or domain may already exist)", nil)
		return
	}
	utils.JSON(c, http.StatusCreated, "institution created", inst)
}

// PUT /institutions/:id – update an institution
func (h *Handler) UpdateInstitution(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name         string `json:"name"`
		Domain       string `json:"domain"`
		Code         string `json:"code"`
		Status       string `json:"status"`
		StudentLimit *int   `json:"student_limit"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Domain != "" {
		updates["domain"] = req.Domain
	}
	if req.Code != "" {
		updates["code"] = req.Code
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.StudentLimit != nil {
		updates["student_limit"] = *req.StudentLimit
	}

	if err := h.DB.Model(&models.Institution{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update institution", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "institution updated", gin.H{"id": id})
}

// GET /institutions/:id/members – list members of an institution
func (h *Handler) ListInstitutionMembers(c *gin.Context) {
	id := c.Param("id")

	var users []models.User
	if err := h.DB.Preload("Roles").Where("institution_id = ?", id).Find(&users).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to list members", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "members", users)
}

// PUT /institutions/:id/members/:user_id/status
func (h *Handler) UpdateInstitutionMemberStatus(c *gin.Context) {
	institutionID := c.Param("id")
	memberID := c.Param("user_id")
	currentUserID := c.GetString("user_id")
	rolesValue, _ := c.Get("roles")
	roles := authz.NormalizeRoleClaims(rolesValue)

	var req struct {
		Status string `json:"status" binding:"required,oneof=active inactive"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if !authz.HasAnyRole(roles, authz.RoleSuperAdmin, authz.RoleSubscriptionManager) {
		if !authz.HasAnyRole(roles, authz.RoleInstitutionAdmin) {
			utils.JSON(c, http.StatusForbidden, "not authorized to manage institution members", nil)
			return
		}
		var currentUser models.User
		if err := h.DB.First(&currentUser, "id = ?", currentUserID).Error; err != nil {
			utils.JSON(c, http.StatusUnauthorized, "failed to identify user", nil)
			return
		}
		if currentUser.InstitutionID == nil || *currentUser.InstitutionID != institutionID {
			utils.JSON(c, http.StatusForbidden, "not authorized to manage this institution", nil)
			return
		}
	}

	var member models.User
	if err := h.DB.First(&member, "id = ? AND institution_id = ?", memberID, institutionID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "institution member not found", nil)
		return
	}

	if err := h.DB.Model(&member).Update("status", req.Status).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update member status", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "member status updated", gin.H{
		"user_id": memberID,
		"status":  req.Status,
	})
}

// GET /institutions/:id/overview – institution access, member health, and growth metrics
func (h *Handler) GetInstitutionOverview(c *gin.Context) {
	id := c.Param("id")
	currentUserID := c.GetString("user_id")
	rolesValue, _ := c.Get("roles")
	roles := authz.NormalizeRoleClaims(rolesValue)

	var currentUser models.User
	if err := h.DB.Preload("Roles").First(&currentUser, "id = ?", currentUserID).Error; err != nil {
		utils.JSON(c, http.StatusUnauthorized, "failed to identify user", nil)
		return
	}

	if !authz.HasAnyRole(roles, authz.RoleSuperAdmin, authz.RoleSubscriptionManager) &&
		(currentUser.InstitutionID == nil || *currentUser.InstitutionID != id || !authz.HasAnyRole(roles, authz.RoleInstitutionAdmin)) {
		utils.JSON(c, http.StatusForbidden, "not authorized to view this institution", nil)
		return
	}

	var institution models.Institution
	if err := h.DB.First(&institution, "id = ?", id).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "institution not found", nil)
		return
	}

	var members []models.User
	if err := h.DB.Preload("Roles").Where("institution_id = ?", id).Order("created_at desc").Find(&members).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load institution members", nil)
		return
	}

	var subscriptions []models.Subscription
	if err := h.DB.Where("institution_id = ?", id).Order("created_at desc").Find(&subscriptions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load institution subscriptions", nil)
		return
	}

	productByID := map[string]models.Product{}
	for _, sub := range subscriptions {
		if sub.ProductID == nil || *sub.ProductID == "" {
			continue
		}
		if _, exists := productByID[*sub.ProductID]; exists {
			continue
		}
		var product models.Product
		if err := h.DB.First(&product, "id = ?", *sub.ProductID).Error; err == nil {
			productByID[*sub.ProductID] = product
		}
	}

	var progressRows []models.Progress
	memberIDs := make([]string, 0, len(members))
	for _, member := range members {
		memberIDs = append(memberIDs, member.ID)
	}
	if len(memberIDs) > 0 {
		h.DB.Where("user_id IN ?", memberIDs).Find(&progressRows)
	}

	type memberProgress struct {
		totalProgress    int
		progressRows     int
		avgProgress      int
		completedLessons int
		lastLearningAt   *time.Time
	}
	progressByUser := map[string]memberProgress{}
	for _, row := range progressRows {
		entry := progressByUser[row.UserID]
		count := entry.completedLessons
		if row.CompletedAt != nil {
			count++
		}
		if entry.lastLearningAt == nil || row.UpdatedAt.After(*entry.lastLearningAt) {
			updatedAt := row.UpdatedAt
			entry.lastLearningAt = &updatedAt
		}

		entry.totalProgress += row.ProgressPercent
		entry.progressRows++
		entry.avgProgress = entry.totalProgress / entry.progressRows
		entry.completedLessons = count
		progressByUser[row.UserID] = entry
	}

	type memberOverview struct {
		ID               string        `json:"id"`
		Email            string        `json:"email"`
		FullName         string        `json:"full_name"`
		Status           string        `json:"status"`
		Roles            []models.Role `json:"roles"`
		LastLoginAt      *time.Time    `json:"last_login_at"`
		LastActiveAt     *time.Time    `json:"last_active_at"`
		CreatedAt        time.Time     `json:"created_at"`
		ProgressPercent  int           `json:"progress_percent"`
		CompletedLessons int           `json:"completed_lessons"`
		LastLearningAt   *time.Time    `json:"last_learning_at"`
	}

	memberSummaries := make([]memberOverview, 0, len(members))
	totalProgress := 0
	activeMembers := 0
	activeLearners := 0
	inactiveMembers := 0
	now := time.Now()

	monthlyStudents := map[string]int{}
	monthlyLearners := map[string]int{}

	for _, member := range members {
		progress := progressByUser[member.ID]
		if member.Status == "active" {
			activeMembers++
		} else {
			inactiveMembers++
		}
		if progress.completedLessons > 0 || progress.avgProgress > 0 {
			activeLearners++
		}
		totalProgress += progress.avgProgress

		monthKey := member.CreatedAt.Format("2006-01")
		monthlyStudents[monthKey]++
		if progress.lastLearningAt != nil {
			monthlyLearners[progress.lastLearningAt.Format("2006-01")]++
		}

		memberSummaries = append(memberSummaries, memberOverview{
			ID:               member.ID,
			Email:            member.Email,
			FullName:         member.FullName,
			Status:           member.Status,
			Roles:            member.Roles,
			LastLoginAt:      member.LastLoginAt,
			LastActiveAt:     member.LastActiveAt,
			CreatedAt:        member.CreatedAt,
			ProgressPercent:  progress.avgProgress,
			CompletedLessons: progress.completedLessons,
			LastLearningAt:   progress.lastLearningAt,
		})
	}

	sort.Slice(memberSummaries, func(i, j int) bool {
		left := memberSummaries[i].LastActiveAt
		right := memberSummaries[j].LastActiveAt
		if left == nil && right == nil {
			return memberSummaries[i].CreatedAt.After(memberSummaries[j].CreatedAt)
		}
		if left == nil {
			return false
		}
		if right == nil {
			return true
		}
		return left.After(*right)
	})

	type subscriptionOverview struct {
		models.Subscription
		ProductName  string   `json:"product_name"`
		ProductTier  string   `json:"product_tier"`
		Price        float64  `json:"price"`
		Currency     string   `json:"currency"`
		ContentTypes []string `json:"content_types"`
	}

	type productAccess struct {
		ProductID               string   `json:"product_id"`
		Name                    string   `json:"name"`
		Tier                    string   `json:"tier"`
		Status                  string   `json:"status"`
		Price                   float64  `json:"price"`
		Currency                string   `json:"currency"`
		ContentTypes            []string `json:"content_types"`
		ActiveSubscriptionCount int      `json:"active_subscription_count"`
		TotalSubscriptionCount  int      `json:"total_subscription_count"`
	}

	type paymentOverview struct {
		ID                 string    `json:"id"`
		PurchaseID         string    `json:"purchase_id"`
		SubscriptionID     *string   `json:"subscription_id"`
		ProductID          *string   `json:"product_id"`
		PlanCode           string    `json:"plan_code"`
		Description        string    `json:"description"`
		RazorpayPaymentID  *string   `json:"razorpay_payment_id"`
		RazorpayOrderID    *string   `json:"razorpay_order_id"`
		Amount             int       `json:"amount"`
		Currency           string    `json:"currency"`
		Status             string    `json:"status"`
		CreatedAt          time.Time `json:"created_at"`
		ProductName        string    `json:"product_name"`
		ProductTier        string    `json:"product_tier"`
		SubscriptionStatus string    `json:"subscription_status"`
		AccessStatus       string    `json:"access_status"`
	}

	subscriptionSummaries := make([]subscriptionOverview, 0, len(subscriptions))
	productAccessMap := map[string]*productAccess{}
	activeSubscriptions := 0

	for _, sub := range subscriptions {
		var (
			productName  string
			productTier  string
			price        float64
			currency     string
			contentTypes []string
		)
		if sub.ProductID != nil {
			if product, exists := productByID[*sub.ProductID]; exists {
				productName = product.Name
				productTier = product.Tier
				price = product.Price
				currency = product.Currency
				contentTypes = product.ContentTypes

				accessEntry, exists := productAccessMap[product.ID]
				if !exists {
					accessEntry = &productAccess{
						ProductID:    product.ID,
						Name:         product.Name,
						Tier:         product.Tier,
						Status:       product.Status,
						Price:        product.Price,
						Currency:     product.Currency,
						ContentTypes: product.ContentTypes,
					}
					productAccessMap[product.ID] = accessEntry
				}
				accessEntry.TotalSubscriptionCount++
				if sub.Status == "active" {
					accessEntry.ActiveSubscriptionCount++
				}
			}
		}

		if sub.Status == "active" {
			activeSubscriptions++
		}
		subscriptionSummaries = append(subscriptionSummaries, subscriptionOverview{
			Subscription: sub,
			ProductName:  productName,
			ProductTier:  productTier,
			Price:        price,
			Currency:     currency,
			ContentTypes: contentTypes,
		})
	}

	productAccessList := make([]productAccess, 0, len(productAccessMap))
	for _, access := range productAccessMap {
		productAccessList = append(productAccessList, *access)
	}
	sort.Slice(productAccessList, func(i, j int) bool {
		if productAccessList[i].ActiveSubscriptionCount == productAccessList[j].ActiveSubscriptionCount {
			return productAccessList[i].Name < productAccessList[j].Name
		}
		return productAccessList[i].ActiveSubscriptionCount > productAccessList[j].ActiveSubscriptionCount
	})

	var payments []models.Payment
	if err := h.DB.Where("institution_id = ?", id).Order("created_at desc").Find(&payments).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to load institution payments", nil)
		return
	}

	subscriptionStatusByID := map[string]string{}
	for _, sub := range subscriptions {
		subscriptionStatusByID[sub.ID] = sub.Status
	}

	paymentSummaries := make([]paymentOverview, 0, len(payments))
	totalBilling := 0.0
	for _, payment := range payments {
		row := paymentOverview{
			ID:                payment.ID,
			SubscriptionID:    payment.SubscriptionID,
			ProductID:         payment.ProductID,
			PlanCode:          payment.PlanCode,
			Description:       payment.Description,
			RazorpayPaymentID: payment.RazorpayPaymentID,
			RazorpayOrderID:   payment.RazorpayOrderID,
			Amount:            payment.Amount,
			Currency:          payment.Currency,
			Status:            payment.Status,
			CreatedAt:         payment.CreatedAt,
		}

		if payment.ProductID != nil {
			if product, exists := productByID[*payment.ProductID]; exists {
				row.ProductName = product.Name
				row.ProductTier = product.Tier
			}
		}
		if payment.SubscriptionID != nil {
			row.SubscriptionStatus = subscriptionStatusByID[*payment.SubscriptionID]
		}
		var purchase models.Purchase
		if err := h.DB.Select("id, access_status").First(&purchase, "payment_id = ?", payment.ID).Error; err == nil {
			row.PurchaseID = purchase.ID
			row.AccessStatus = purchase.AccessStatus
		}
		if payment.Status == "captured" {
			totalBilling += float64(payment.Amount) / 100
		}

		paymentSummaries = append(paymentSummaries, row)
	}

	type monthlyGrowthPoint struct {
		Label          string `json:"label"`
		Students       int    `json:"students"`
		ActiveLearners int    `json:"active_learners"`
	}

	monthlyGrowth := make([]monthlyGrowthPoint, 0, 6)
	for offset := 5; offset >= 0; offset-- {
		month := now.AddDate(0, -offset, 0)
		key := month.Format("2006-01")
		monthlyGrowth = append(monthlyGrowth, monthlyGrowthPoint{
			Label:          month.Format("Jan 2006"),
			Students:       monthlyStudents[key],
			ActiveLearners: monthlyLearners[key],
		})
	}

	totalMembers := len(members)
	seatsUsed := totalMembers
	seatsRemaining := 0
	utilizationPercent := 0
	if institution.StudentLimit > 0 {
		seatsRemaining = institution.StudentLimit - seatsUsed
		if seatsRemaining < 0 {
			seatsRemaining = 0
		}
		utilizationPercent = int(float64(seatsUsed) / float64(institution.StudentLimit) * 100)
		if utilizationPercent > 100 {
			utilizationPercent = 100
		}
	}

	avgProgress := 0
	if totalMembers > 0 {
		avgProgress = totalProgress / totalMembers
	}

	utils.JSON(c, http.StatusOK, "institution overview", gin.H{
		"institution": institution,
		"summary": gin.H{
			"total_members":            totalMembers,
			"active_members":           activeMembers,
			"inactive_members":         inactiveMembers,
			"active_learners":          activeLearners,
			"student_limit":            institution.StudentLimit,
			"seats_used":               seatsUsed,
			"seats_remaining":          seatsRemaining,
			"seat_utilization_percent": utilizationPercent,
			"active_subscriptions":     activeSubscriptions,
			"total_subscriptions":      len(subscriptions),
			"active_products":          len(productAccessList),
			"billing_total":            totalBilling,
			"avg_progress_percent":     avgProgress,
		},
		"members":        memberSummaries,
		"subscriptions":  subscriptionSummaries,
		"payments":       paymentSummaries,
		"product_access": productAccessList,
		"monthly_growth": monthlyGrowth,
	})
}

// POST /institutions/:institution_id/bulk-invite – CSV upload to create student accounts
func (h *Handler) BulkInvite(c *gin.Context) {
	institutionID := c.Param("institution_id")

	var inst models.Institution
	if err := h.DB.First(&inst, "id = ?", institutionID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "institution not found", nil)
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "csv file is required", nil)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "failed to parse csv", nil)
		return
	}

	var role models.Role
	h.DB.Where("name = ?", "student").First(&role)

	var currentCount int64
	h.DB.Model(&models.User{}).Where("institution_id = ?", institutionID).Count(&currentCount)

	imported := 0
	for i, row := range records {
		if i == 0 || len(row) < 2 {
			continue
		}
		email := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		if email == "" || name == "" {
			continue
		}

		var count int64
		h.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
		if count > 0 {
			continue
		}
		if inst.StudentLimit > 0 && int(currentCount)+imported >= inst.StudentLimit {
			break
		}

		defaultPass, _ := bcrypt.GenerateFromPassword([]byte("student123"), bcrypt.DefaultCost)
		defaultPassStr := string(defaultPass)
		user := models.User{
			Email:         email,
			FullName:      name,
			PasswordHash:  &defaultPassStr,
			Status:        "active",
			InstitutionID: &inst.ID,
		}
		if err := h.DB.Create(&user).Error; err == nil {
			h.DB.Model(&user).Association("Roles").Append(&role)
			imported++
		}
	}

	utils.JSON(c, http.StatusOK, "import complete", gin.H{"imported_count": imported})
}
