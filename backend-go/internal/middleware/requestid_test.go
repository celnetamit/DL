package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"lms-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func TestRequestID_GeneratesHeaderWhenMissing(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/test", func(c *gin.Context) {
		value, exists := c.Get(middleware.RequestIDKey)
		if !exists {
			t.Fatalf("expected request_id in context")
		}
		requestID, ok := value.(string)
		if !ok || requestID == "" {
			t.Fatalf("expected non-empty request_id string")
		}
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("X-Request-Id"); got == "" {
		t.Fatalf("expected X-Request-Id response header")
	}
}

func TestRequestID_PreservesIncomingHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(middleware.RequestID())
	r.GET("/test", func(c *gin.Context) {
		value := c.GetString(middleware.RequestIDKey)
		if value != "req-123" {
			t.Fatalf("expected context request ID req-123, got %q", value)
		}
		c.Status(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/test", nil)
	req.Header.Set("X-Request-Id", "req-123")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	if got := w.Header().Get("X-Request-Id"); got != "req-123" {
		t.Fatalf("expected X-Request-Id req-123, got %q", got)
	}
}
