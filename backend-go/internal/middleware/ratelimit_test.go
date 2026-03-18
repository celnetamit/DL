package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"lms-backend/internal/middleware"

	"github.com/gin-gonic/gin"
)

func TestRateLimit_BlocksAfterLimit(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Allow only 3 requests per 1 minute
	r.POST("/test", middleware.RateLimit(3, 1*time.Minute), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	for i := 1; i <= 4; i++ {
		req := httptest.NewRequest(http.MethodPost, "/test", nil)
		req.RemoteAddr = "192.168.1.1:12345" // Same IP
		w := httptest.NewRecorder()
		r.ServeHTTP(w, req)

		if i <= 3 && w.Code != http.StatusOK {
			t.Errorf("request %d: expected 200, got %d", i, w.Code)
		}
		if i == 4 && w.Code != http.StatusTooManyRequests {
			t.Errorf("request %d: expected 429, got %d", i, w.Code)
		}
	}
}

func TestRateLimit_AllowsAfterWindowReset(t *testing.T) {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	// Very short window for test speed
	r.POST("/test-reset", middleware.RateLimit(1, 10*time.Millisecond), func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	// First request — should pass
	req1 := httptest.NewRequest(http.MethodPost, "/test-reset", nil)
	req1.RemoteAddr = "10.0.0.1:9999"
	w1 := httptest.NewRecorder()
	r.ServeHTTP(w1, req1)
	if w1.Code != http.StatusOK {
		t.Errorf("first request: expected 200, got %d", w1.Code)
	}

	// Wait for the window to expire
	time.Sleep(20 * time.Millisecond)

	// Second request after reset — should pass as a fresh window
	req2 := httptest.NewRequest(http.MethodPost, "/test-reset", nil)
	req2.RemoteAddr = "10.0.0.1:9999"
	w2 := httptest.NewRecorder()
	r.ServeHTTP(w2, req2)
	if w2.Code != http.StatusOK {
		t.Errorf("post-reset request: expected 200, got %d", w2.Code)
	}
}
