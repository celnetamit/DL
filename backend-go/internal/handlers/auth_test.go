package handlers_test

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"regexp"

	"lms-backend/internal/config"
	"lms-backend/internal/handlers"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// setupMockDB creates a GORM DB backed by go-sqlmock (pure Go, no CGO).
func setupMockDB(t *testing.T) (*gorm.DB, sqlmock.Sqlmock) {
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

func setupRouter(h *handlers.Handler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/v1/auth/register", h.Register)
	r.POST("/api/v1/auth/login", h.Login)
	return r
}

// TestRegister_BadPayload verifies a 400 when required fields are missing.
func TestRegister_BadPayload(t *testing.T) {
	db, _ := setupMockDB(t)
	h := &handlers.Handler{DB: db, Config: config.Config{JwtSecret: "s", Port: "8080"}}
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register",
		bytes.NewBufferString(`{"email":"notvalid"}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d — body: %s", w.Code, w.Body.String())
	}
}

// TestLogin_BadPayload verifies a 400 when required fields are missing.
func TestLogin_BadPayload(t *testing.T) {
	db, _ := setupMockDB(t)
	h := &handlers.Handler{DB: db, Config: config.Config{JwtSecret: "s", Port: "8080"}}
	r := setupRouter(h)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login",
		bytes.NewBufferString(`{}`))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d — body: %s", w.Code, w.Body.String())
	}
}

// TestLogin_UserNotFound verifies 401 when the user doesn't exist.
func TestLogin_UserNotFound(t *testing.T) {
	db, mock := setupMockDB(t)
	h := &handlers.Handler{DB: db, Config: config.Config{JwtSecret: "s", Port: "8080"}}
	r := setupRouter(h)

	// Mock: the DB returns no rows for this email
	mock.ExpectQuery(regexp.QuoteMeta(`SELECT * FROM "users"`)).
		WillReturnRows(sqlmock.NewRows([]string{"id"}))

	payload, _ := json.Marshal(map[string]string{
		"email":    "ghost@example.com",
		"password": "password123",
	})
	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewBuffer(payload))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d — body: %s", w.Code, w.Body.String())
	}

	_ = sql.ErrNoRows // suppress lint
}
