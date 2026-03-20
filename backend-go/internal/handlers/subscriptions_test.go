package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"regexp"
	"testing"
	"time"

	"lms-backend/internal/services"
	"lms-backend/internal/utils"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func setupSubscriptionsMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
	t.Helper()
	sqlDB, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("failed to create sqlmock: %v", err)
	}
	db, err := gorm.Open(postgres.New(postgres.Config{Conn: sqlDB}), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open gorm with mock: %v", err)
	}
	return db, mock
}

func TestVerifyOrderPayment_InvalidSignature(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{
		DB:       db,
		Razorpay: services.RazorpayService{KeyID: "rzp_test", KeySecret: "secret_fallback"},
	}

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.POST("/verify", handler.VerifyOrderPayment)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "value" FROM "app_settings" WHERE key = $1 ORDER BY "app_settings"."id" LIMIT $2`)).
		WithArgs("RAZORPAY_KEY_ID", 1).
		WillReturnRows(sqlmock.NewRows([]string{"value"}))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "value" FROM "app_settings" WHERE key = $1 ORDER BY "app_settings"."id" LIMIT $2`)).
		WithArgs("RAZORPAY_KEY_SECRET", 1).
		WillReturnRows(sqlmock.NewRows([]string{"value"}))

	payload, _ := json.Marshal(map[string]string{
		"razorpay_payment_id": "pay_test",
		"razorpay_order_id":   "order_test",
		"razorpay_signature":  "bad_signature",
	})
	req := httptest.NewRequest(http.MethodPost, "/verify", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGetMyPurchasesReturnsEnrichedPurchaseHistory(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	userID := "user-1"
	productID := "product-1"
	subscriptionID := "sub-1"
	paymentID := "payment-1"
	purchaseID := "purchase-1"
	orderID := "order-1"
	paymentRef := "pay_ref_1"
	now := time.Now().UTC()

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "email", "full_name", "status", "institution_id", "created_at", "updated_at",
		}).AddRow(userID, "buyer@example.com", "Buyer", "active", nil, now, now))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "purchases" WHERE user_id = $1 ORDER BY created_at desc`)).
		WithArgs(userID).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "institution_id", "product_id", "subscription_id", "payment_id", "plan_code",
			"purchase_type", "access_status", "payment_status", "amount", "currency", "activated_at",
			"access_ends_at", "razorpay_order_id", "razorpay_payment_id", "created_at", "updated_at",
		}).AddRow(
			purchaseID, userID, nil, productID, subscriptionID, paymentID, "PLAN_ONE",
			"one_time", "active", "captured", 199900, "INR", now, nil, orderID, paymentRef, now, now,
		))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT name, tier FROM "products" WHERE id = $1 ORDER BY "products"."id" LIMIT $2`)).
		WithArgs(productID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"name", "tier"}).AddRow("Research Pack", "bundle"))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "status" FROM "subscriptions" WHERE id = $1 ORDER BY "subscriptions"."id" LIMIT $2`)).
		WithArgs(subscriptionID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"status"}).AddRow("active"))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT "email" FROM "users" WHERE id = $1 ORDER BY "users"."id" LIMIT $2`)).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"email"}).AddRow("buyer@example.com"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/purchases", func(c *gin.Context) {
		c.Set("user_id", userID)
		handler.GetMyPurchases(c)
	})

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
	if !resp.Success {
		t.Fatalf("expected success response, got %+v", resp)
	}

	rows, err := json.Marshal(resp.Data)
	if err != nil {
		t.Fatalf("failed to re-marshal data: %v", err)
	}

	var purchases []map[string]interface{}
	if err := json.Unmarshal(rows, &purchases); err != nil {
		t.Fatalf("failed to decode purchases payload: %v", err)
	}
	if len(purchases) != 1 {
		t.Fatalf("expected 1 purchase, got %d", len(purchases))
	}

	row := purchases[0]
	if row["product_name"] != "Research Pack" {
		t.Fatalf("expected product_name Research Pack, got %#v", row["product_name"])
	}
	if row["product_tier"] != "bundle" {
		t.Fatalf("expected product_tier bundle, got %#v", row["product_tier"])
	}
	if row["subscription_status"] != "active" {
		t.Fatalf("expected subscription_status active, got %#v", row["subscription_status"])
	}
	if row["user_email"] != "buyer@example.com" {
		t.Fatalf("expected user_email buyer@example.com, got %#v", row["user_email"])
	}
}
