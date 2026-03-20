package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"lms-backend/internal/config"

	"github.com/gin-gonic/gin"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestValidateAIResultRejectsIncompletePayload(t *testing.T) {
	err := validateAIResult(aiGenerateResponse{
		Title:      "Lesson",
		Summary:    "Short summary",
		KeyPoints:  []string{"one"},
		Flashcards: []any{map[string]string{"term": "A", "definition": "B"}},
	})
	if err == nil {
		t.Fatalf("expected validation error for incomplete AI result")
	}
}

func TestGenerateMaterialReturnsBadGatewayWhenAIEngineFails(t *testing.T) {
	originalClient := aiHTTPClient
	aiHTTPClient = &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusBadRequest,
				Body:       io.NopCloser(strings.NewReader(`{"detail":"Gemini request failed"}`)),
				Header:     make(http.Header),
			}, nil
		}),
	}
	defer func() { aiHTTPClient = originalClient }()

	handler := &Handler{
		Config: config.Config{AIEngineURL: "http://ai-engine.test"},
	}

	reqBody, _ := json.Marshal(map[string]string{
		"course_id": "course-1",
		"module_id": "module-1",
		"text":      "Sample lesson source content",
		"title":     "Generated Lesson",
	})

	router := setupGenerateMaterialRouter(handler)
	req := httptest.NewRequest(http.MethodPost, "/generate", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGenerateMaterialRejectsMalformedAIResponse(t *testing.T) {
	originalClient := aiHTTPClient
	aiHTTPClient = &http.Client{
		Transport: roundTripFunc(func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"title":"Lesson","summary":"","key_points":["only one"],"flashcards":[]}`)),
				Header:     http.Header{"Content-Type": []string{"application/json"}},
			}, nil
		}),
	}
	defer func() { aiHTTPClient = originalClient }()

	handler := &Handler{
		Config: config.Config{AIEngineURL: "http://ai-engine.test"},
	}

	reqBody, _ := json.Marshal(map[string]string{
		"course_id": "course-1",
		"module_id": "module-1",
		"text":      "Sample lesson source content",
		"title":     "Generated Lesson",
	})

	router := setupGenerateMaterialRouter(handler)
	req := httptest.NewRequest(http.MethodPost, "/generate", bytes.NewBuffer(reqBody))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusBadGateway {
		t.Fatalf("expected 502, got %d: %s", w.Code, w.Body.String())
	}
}

func setupGenerateMaterialRouter(h *Handler) http.Handler {
	router := gin.New()
	router.POST("/generate", h.GenerateMaterial)
	return router
}
