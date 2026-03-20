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

func TestGetAdminAnalyticsReturnsSystemStatusAndTrends(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	now := time.Now().UTC()
	startMonth := time.Date(now.AddDate(0, -(6-1), 0).Year(), now.AddDate(0, -(6-1), 0).Month(), 1, 0, 0, 0, 0, time.UTC)

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "users"`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(12))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "subscriptions" WHERE status = $1`)).
		WithArgs("active").
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(5))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT COALESCE(sum(amount), 0) as total FROM "payments" WHERE status = $1`)).
		WithArgs("captured").
		WillReturnRows(sqlmock.NewRows([]string{"total"}).AddRow(499900))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "institutions" WHERE "institutions"."deleted_at" IS NULL`)).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(3))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "ai_generation_logs" WHERE status = $1 AND created_at >= $2`)).
		WithArgs("failed", sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(2))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT count(*) FROM "audit_logs" WHERE created_at >= $1`)).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{"count"}).AddRow(11))

	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, created_at FROM "users" WHERE created_at >= $1`)).
		WithArgs(startMonth).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at"}).
			AddRow("user-1", now).
			AddRow("user-2", now.AddDate(0, -1, 0)))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, created_at FROM "institutions" WHERE created_at >= $1 AND "institutions"."deleted_at" IS NULL`)).
		WithArgs(startMonth).
		WillReturnRows(sqlmock.NewRows([]string{"id", "created_at"}).
			AddRow("inst-1", now))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, status, created_at FROM "subscriptions" WHERE created_at >= $1`)).
		WithArgs(startMonth).
		WillReturnRows(sqlmock.NewRows([]string{"id", "status", "created_at"}).
			AddRow("sub-1", "active", now).
			AddRow("sub-2", "cancelled", now.AddDate(0, -1, 0)))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, product_id, amount, status, created_at FROM "payments" WHERE created_at >= $1`)).
		WithArgs(startMonth).
		WillReturnRows(sqlmock.NewRows([]string{"id", "product_id", "amount", "status", "created_at"}).
			AddRow("payment-1", "prod-1", 299900, "captured", now).
			AddRow("payment-2", "prod-2", 200000, "failed", now.AddDate(0, -1, 0)))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, product_id, access_status, payment_status, created_at FROM "purchases" WHERE created_at >= $1`)).
		WithArgs(startMonth).
		WillReturnRows(sqlmock.NewRows([]string{"id", "product_id", "access_status", "payment_status", "created_at"}).
			AddRow("purchase-1", "prod-1", "active", "captured", now).
			AddRow("purchase-2", "prod-2", "pending", "failed", now.AddDate(0, -1, 0)))
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT id, name FROM "products" WHERE id IN ($1,$2)`)).
		WithArgs("prod-1", "prod-2").
		WillReturnRows(sqlmock.NewRows([]string{"id", "name"}).
			AddRow("prod-1", "Research Pack").
			AddRow("prod-2", "Case Study Pack"))

	gin.SetMode(gin.TestMode)
	router := gin.New()
	router.GET("/analytics", handler.GetAdminAnalytics)

	req := httptest.NewRequest(http.MethodGet, "/analytics?months=6", nil)
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
		t.Fatalf("failed to marshal analytics payload: %v", err)
	}

	var payload map[string]interface{}
	if err := json.Unmarshal(rows, &payload); err != nil {
		t.Fatalf("failed to decode analytics payload: %v", err)
	}

	if int(payload["total_users"].(float64)) != 12 {
		t.Fatalf("expected total_users 12, got %#v", payload["total_users"])
	}
	if int(payload["total_institutions"].(float64)) != 3 {
		t.Fatalf("expected total_institutions 3, got %#v", payload["total_institutions"])
	}

	systemStatus, ok := payload["system_status"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected system_status object, got %#v", payload["system_status"])
	}
	database, ok := systemStatus["database"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected database status object, got %#v", systemStatus["database"])
	}
	if database["status"] != "up" {
		t.Fatalf("expected database status up in sqlmock environment, got %#v", database["status"])
	}
	ai, ok := systemStatus["ai"].(map[string]interface{})
	if !ok || int(ai["failed_generations_last_24h"].(float64)) != 2 {
		t.Fatalf("expected ai failed count 2, got %#v", systemStatus["ai"])
	}
	audit, ok := systemStatus["audit"].(map[string]interface{})
	if !ok || int(audit["events_last_24h"].(float64)) != 11 {
		t.Fatalf("expected audit events 11, got %#v", systemStatus["audit"])
	}

	topProducts, ok := payload["top_products"].([]interface{})
	if !ok || len(topProducts) != 2 {
		t.Fatalf("expected 2 top products, got %#v", payload["top_products"])
	}
}
