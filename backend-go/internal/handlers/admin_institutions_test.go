package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"lms-backend/internal/utils"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
)

func TestListAllPaymentsReturnsEnrichedBillingRows(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	userID := "user-1"
	institutionID := "inst-1"
	productID := "prod-1"
	subscriptionID := "sub-1"
	paymentID := "payment-1"
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "payments" ORDER BY created_at desc`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "institution_id", "subscription_id", "product_id", "plan_code", "description",
			"razorpay_payment_id", "razorpay_order_id", "amount", "currency", "status", "created_at",
		}).AddRow(
			paymentID, userID, institutionID, subscriptionID, productID, "PLAN_PRO", "Library Access",
			"pay_1", "order_1", 299900, "INR", "captured", now,
		))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT email, full_name FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"email", "full_name"}).AddRow("buyer@example.com", "Buyer"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT name, tier FROM "products" WHERE id = $1 ORDER BY "products"."id" LIMIT $2`)).
		WithArgs(productID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"name", "tier"}).AddRow("Research Pack", "bundle"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "name" FROM "institutions" WHERE id = $1 AND "institutions"."deleted_at" IS NULL ORDER BY "institutions"."id" LIMIT $2`)).
		WithArgs(institutionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"name"}).AddRow("Digital Library University"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "status" FROM "subscriptions" WHERE id = $1 ORDER BY "subscriptions"."id" LIMIT $2`)).
		WithArgs(subscriptionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"status"}).AddRow("active"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, access_status FROM "purchases" WHERE payment_id = $1 ORDER BY "purchases"."id" LIMIT $2`)).
		WithArgs(paymentID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "access_status"}).AddRow("purchase-1", "active"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/payments", handler.ListAllPayments)

	req := httptest.NewRequest(http.MethodGet, "/payments", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp utils.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	rows, err := json.Marshal(resp.Data)
	if err != nil {
		t.Fatalf("failed to marshal response data: %v", err)
	}

	var payments []map[string]interface{}
	if err := json.Unmarshal(rows, &payments); err != nil {
		t.Fatalf("failed to decode payments: %v", err)
	}
	if len(payments) != 1 {
		t.Fatalf("expected 1 payment row, got %d", len(payments))
	}

	row := payments[0]
	if row["user_email"] != "buyer@example.com" {
		t.Fatalf("expected user_email to be enriched, got %#v", row["user_email"])
	}
	if row["product_name"] != "Research Pack" {
		t.Fatalf("expected product_name Research Pack, got %#v", row["product_name"])
	}
	if row["institution_name"] != "Digital Library University" {
		t.Fatalf("expected institution_name Digital Library University, got %#v", row["institution_name"])
	}
	if row["subscription_status"] != "active" {
		t.Fatalf("expected subscription_status active, got %#v", row["subscription_status"])
	}
	if row["access_status"] != "active" {
		t.Fatalf("expected access_status active, got %#v", row["access_status"])
	}
}

func TestListAllPurchasesReturnsEnrichedLicenseRows(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	userID := "user-1"
	institutionID := "inst-1"
	productID := "prod-1"
	subscriptionID := "sub-1"
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "purchases" ORDER BY created_at desc`)).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "institution_id", "product_id", "subscription_id", "payment_id", "plan_code",
			"purchase_type", "access_status", "payment_status", "amount", "currency", "activated_at",
			"access_ends_at", "razorpay_order_id", "razorpay_payment_id", "created_at", "updated_at",
		}).AddRow(
			"purchase-1", userID, institutionID, productID, subscriptionID, "payment-1", "PLAN_PRO",
			"one_time", "active", "captured", 299900, "INR", now, nil, "order_1", "pay_1", now, now,
		))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT email, full_name FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"email", "full_name"}).AddRow("buyer@example.com", "Buyer"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT name, tier FROM "products" WHERE id = $1 ORDER BY "products"."id" LIMIT $2`)).
		WithArgs(productID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"name", "tier"}).AddRow("Research Pack", "bundle"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "name" FROM "institutions" WHERE id = $1 AND "institutions"."deleted_at" IS NULL ORDER BY "institutions"."id" LIMIT $2`)).
		WithArgs(institutionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"name"}).AddRow("Digital Library University"))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "status" FROM "subscriptions" WHERE id = $1 ORDER BY "subscriptions"."id" LIMIT $2`)).
		WithArgs(subscriptionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"status"}).AddRow("active"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/purchases", handler.ListAllPurchases)

	req := httptest.NewRequest(http.MethodGet, "/purchases", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp utils.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	rows, err := json.Marshal(resp.Data)
	if err != nil {
		t.Fatalf("failed to marshal response data: %v", err)
	}

	var purchases []map[string]interface{}
	if err := json.Unmarshal(rows, &purchases); err != nil {
		t.Fatalf("failed to decode purchases: %v", err)
	}
	if len(purchases) != 1 {
		t.Fatalf("expected 1 purchase row, got %d", len(purchases))
	}

	row := purchases[0]
	if row["user_email"] != "buyer@example.com" {
		t.Fatalf("expected user_email to be enriched, got %#v", row["user_email"])
	}
	if row["product_name"] != "Research Pack" {
		t.Fatalf("expected product_name Research Pack, got %#v", row["product_name"])
	}
	if row["institution_name"] != "Digital Library University" {
		t.Fatalf("expected institution_name Digital Library University, got %#v", row["institution_name"])
	}
	if row["subscription_status"] != "active" {
		t.Fatalf("expected subscription_status active, got %#v", row["subscription_status"])
	}
}

func TestGetInstitutionOverviewRejectsUnauthorizedInstitutionAdmin(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	currentUserID := "admin-1"
	otherInstitutionID := "inst-other"
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(currentUserID, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "full_name", "status", "institution_id", "created_at", "updated_at",
		}).AddRow(currentUserID, "admin@example.com", "Admin", "active", otherInstitutionID, now, now))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "user_roles" WHERE "user_roles"."user_id" = $1`)).
		WithArgs(currentUserID).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "role_id"}))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/institutions/:id/overview", func(c *gin.Context) {
		c.Set("user_id", currentUserID)
		c.Set("roles", []string{"institution_admin"})
		handler.GetInstitutionOverview(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/institutions/inst-1/overview", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusForbidden {
		t.Fatalf("expected 403, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetInstitutionOverviewReturnsAggregatedSummary(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	currentUserID := "manager-1"
	institutionID := "inst-1"
	productID := "prod-1"
	subscriptionID := "sub-1"
	paymentID := "payment-1"
	memberID := "student-1"
	now := time.Now().UTC()
	lastLogin := now.Add(-24 * time.Hour)
	lastActive := now.Add(-2 * time.Hour)
	completedAt := now.Add(-3 * time.Hour)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(currentUserID, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "full_name", "status", "institution_id", "created_at", "updated_at",
		}).AddRow(currentUserID, "manager@example.com", "Manager", "active", institutionID, now, now))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "user_roles" WHERE "user_roles"."user_id" = $1`)).
		WithArgs(currentUserID).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "role_id"}))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "institutions" WHERE id = $1 AND "institutions"."deleted_at" IS NULL ORDER BY "institutions"."id" LIMIT $2`)).
		WithArgs(institutionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "name", "domain", "code", "status", "student_limit", "created_at", "updated_at", "deleted_at",
		}).AddRow(institutionID, "Digital Library University", "dlu.edu", "DLU", "active", 10, now, now, nil))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE institution_id = $1 ORDER BY created_at desc`)).
		WithArgs(institutionID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "full_name", "status", "last_login_at", "last_active_at", "institution_id", "created_at", "updated_at",
		}).AddRow(memberID, "student@example.com", "Student One", "active", lastLogin, lastActive, institutionID, now, now))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "user_roles" WHERE "user_roles"."user_id" = $1`)).
		WithArgs(memberID).
		WillReturnRows(sqlmock.NewRows([]string{"user_id", "role_id"}))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "subscriptions" WHERE institution_id = $1 ORDER BY created_at desc`)).
		WithArgs(institutionID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "institution_id", "product_id", "plan_code", "status", "created_at", "updated_at",
		}).AddRow(subscriptionID, nil, institutionID, productID, "PLAN_PRO", "active", now, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "products" WHERE id = $1 ORDER BY "products"."id" LIMIT $2`)).
		WithArgs(productID, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "name", "tier", "price", "currency", "content_types", "status",
		}).AddRow(productID, "Research Pack", "bundle", 2999.0, "INR", `{journals,ebooks}`, "active"))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "progress" WHERE user_id IN ($1)`)).
		WithArgs(memberID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "lesson_id", "progress_percent", "last_position_seconds", "completed_at", "updated_at",
		}).AddRow("progress-1", memberID, "lesson-1", 80, 120, completedAt, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "payments" WHERE institution_id = $1 ORDER BY created_at desc`)).
		WithArgs(institutionID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "institution_id", "subscription_id", "product_id", "plan_code", "description",
			"razorpay_payment_id", "razorpay_order_id", "amount", "currency", "status", "created_at",
		}).AddRow(paymentID, memberID, institutionID, subscriptionID, productID, "PLAN_PRO", "Research Pack", "pay_1", "order_1", 299900, "INR", "captured", now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, access_status FROM "purchases" WHERE payment_id = $1 ORDER BY "purchases"."id" LIMIT $2`)).
		WithArgs(paymentID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"id", "access_status"}).AddRow("purchase-1", "active"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/institutions/:id/overview", func(c *gin.Context) {
		c.Set("user_id", currentUserID)
		c.Set("roles", []string{"institution_admin"})
		handler.GetInstitutionOverview(c)
	})

	req := httptest.NewRequest(http.MethodGet, "/institutions/"+institutionID+"/overview", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp utils.APIResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	rows, err := json.Marshal(resp.Data)
	if err != nil {
		t.Fatalf("failed to marshal overview payload: %v", err)
	}

	var overview map[string]interface{}
	if err := json.Unmarshal(rows, &overview); err != nil {
		t.Fatalf("failed to decode overview payload: %v", err)
	}

	summary, ok := overview["summary"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected summary object, got %#v", overview["summary"])
	}
	if int(summary["total_members"].(float64)) != 1 {
		t.Fatalf("expected total_members 1, got %#v", summary["total_members"])
	}
	if int(summary["active_members"].(float64)) != 1 {
		t.Fatalf("expected active_members 1, got %#v", summary["active_members"])
	}
	if int(summary["active_learners"].(float64)) != 1 {
		t.Fatalf("expected active_learners 1, got %#v", summary["active_learners"])
	}
	if int(summary["active_subscriptions"].(float64)) != 1 {
		t.Fatalf("expected active_subscriptions 1, got %#v", summary["active_subscriptions"])
	}
	if int(summary["active_products"].(float64)) != 1 {
		t.Fatalf("expected active_products 1, got %#v", summary["active_products"])
	}
	if int(summary["avg_progress_percent"].(float64)) != 80 {
		t.Fatalf("expected avg_progress_percent 80, got %#v", summary["avg_progress_percent"])
	}
	if summary["billing_total"].(float64) != 2999 {
		t.Fatalf("expected billing_total 2999, got %#v", summary["billing_total"])
	}

	payments, ok := overview["payments"].([]interface{})
	if !ok || len(payments) != 1 {
		t.Fatalf("expected 1 payment overview row, got %#v", overview["payments"])
	}
	productAccess, ok := overview["product_access"].([]interface{})
	if !ok || len(productAccess) != 1 {
		t.Fatalf("expected 1 product_access row, got %#v", overview["product_access"])
	}
}
