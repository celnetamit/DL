package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"lms-backend/internal/config"
	"lms-backend/internal/utils"

	"github.com/DATA-DOG/go-sqlmock"
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

func TestParseAIEngineErrorExtractsStructuredFailureFields(t *testing.T) {
	raw := []byte(`{"detail":{"message":"Gemini blocked the prompt: SAFETY","failure_code":"gemini_prompt_safety","failure_category":"safety"}}`)

	detail := parseAIEngineError(raw)

	if detail.Message != "Gemini blocked the prompt: SAFETY" {
		t.Fatalf("unexpected message: %#v", detail.Message)
	}
	if detail.FailureCode != "gemini_prompt_safety" {
		t.Fatalf("unexpected failure code: %#v", detail.FailureCode)
	}
	if detail.FailureCategory != "safety" {
		t.Fatalf("unexpected failure category: %#v", detail.FailureCategory)
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

func TestListAIGenerationLogsReturnsEnrichedRows(t *testing.T) {
	db, mock := setupSubscriptionsMockDB(t)
	handler := &Handler{DB: db}

	now := time.Now().UTC()
	userID := "user-1"
	courseID := "course-1"
	moduleID := "module-1"
	lessonID := "lesson-1"

	mock.ExpectQuery(`SELECT \* FROM "ai_generation_logs" ORDER BY created_at desc LIMIT \$1`).
		WithArgs(50).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "user_id", "course_id", "module_id", "lesson_id", "provider", "model", "prompt_version",
			"status", "source_type", "source_url", "requested_title", "error_message", "request_payload", "response_payload", "created_at",
		}).AddRow(
			"log-1", userID, courseID, moduleID, lessonID, "gemini", "gemini-1.5-flash", "v2",
			"success", "text", nil, "Generated Lesson", "", `{}`, `{}`, now,
		))

	mock.ExpectQuery(`SELECT email, full_name FROM "users" WHERE id = \$1 ORDER BY "users"\."id" LIMIT \$2`).
		WithArgs(userID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"email", "full_name"}).AddRow("author@example.com", "Author"))
	mock.ExpectQuery(`SELECT "title" FROM "lessons" WHERE id = \$1 ORDER BY "lessons"\."id" LIMIT \$2`).
		WithArgs(lessonID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"title"}).AddRow("Generated Lesson"))
	mock.ExpectQuery(`SELECT "title" FROM "modules" WHERE id = \$1 ORDER BY "modules"\."id" LIMIT \$2`).
		WithArgs(moduleID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"title"}).AddRow("AI Module"))
	mock.ExpectQuery(`SELECT "title" FROM "courses" WHERE id = \$1 ORDER BY "courses"\."id" LIMIT \$2`).
		WithArgs(courseID, 1).
		WillReturnRows(sqlmock.NewRows([]string{"title"}).AddRow("AI Course"))

	router := gin.New()
	router.GET("/ai/logs", handler.ListAIGenerationLogs)

	req := httptest.NewRequest(http.MethodGet, "/ai/logs", nil)
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
		t.Fatalf("failed to marshal data: %v", err)
	}

	var logs []map[string]interface{}
	if err := json.Unmarshal(rows, &logs); err != nil {
		t.Fatalf("failed to decode logs payload: %v", err)
	}
	if len(logs) != 1 {
		t.Fatalf("expected 1 ai log row, got %d", len(logs))
	}
	if logs[0]["user_email"] != "author@example.com" {
		t.Fatalf("expected enriched user_email, got %#v", logs[0]["user_email"])
	}
	if logs[0]["lesson_title"] != "Generated Lesson" {
		t.Fatalf("expected enriched lesson_title, got %#v", logs[0]["lesson_title"])
	}
	if logs[0]["module_title"] != "AI Module" {
		t.Fatalf("expected enriched module_title, got %#v", logs[0]["module_title"])
	}
	if logs[0]["course_title"] != "AI Course" {
		t.Fatalf("expected enriched course_title, got %#v", logs[0]["course_title"])
	}
	if logs[0]["failure_code"] != "" {
		t.Fatalf("expected empty failure_code for success row, got %#v", logs[0]["failure_code"])
	}
	if _, exists := logs[0]["request_payload"]; exists {
		t.Fatalf("expected request_payload to be omitted from api response")
	}
	if _, exists := logs[0]["response_payload"]; exists {
		t.Fatalf("expected response_payload to be omitted from api response")
	}
}

func TestSanitizeAIRequestPayloadRedactsLargeSourceText(t *testing.T) {
	req := generateRequest{
		URL:   "https://example.com/article",
		Text:  strings.Repeat("A", 400),
		Title: "Requested Lesson",
	}

	payload := sanitizeAIRequestPayload(req, 5)
	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		t.Fatalf("failed to decode sanitized request payload: %v", err)
	}

	if data["text_length"].(float64) != 400 {
		t.Fatalf("expected text_length to be retained, got %#v", data["text_length"])
	}
	preview, _ := data["text_preview"].(string)
	if len(preview) >= 400 {
		t.Fatalf("expected text preview to be redacted and truncated, got length %d", len(preview))
	}
	if data["source_type"] != "url" {
		t.Fatalf("expected source_type url, got %#v", data["source_type"])
	}
}

func TestSanitizeAIResponsePayloadRedactsFullAIOutput(t *testing.T) {
	payload := sanitizeAIResponsePayload(aiGenerateResponse{
		Title:         "Lesson",
		Summary:       strings.Repeat("summary ", 80),
		KeyPoints:     []string{"one", "two", "three"},
		Flashcards:    []any{1, 2, 3, 4},
		Provider:      "gemini",
		Model:         "gemini-1.5-flash",
		PromptVersion: "v2",
		GeneratedAt:   time.Now().UTC().Format(time.RFC3339),
	})

	var data map[string]interface{}
	if err := json.Unmarshal(payload, &data); err != nil {
		t.Fatalf("failed to decode sanitized response payload: %v", err)
	}

	if _, exists := data["summary"]; exists {
		t.Fatalf("expected raw summary to be omitted from stored audit payload")
	}
	if data["key_point_count"].(float64) != 3 {
		t.Fatalf("expected key point count, got %#v", data["key_point_count"])
	}
	if data["flashcard_count"].(float64) != 4 {
		t.Fatalf("expected flashcard count, got %#v", data["flashcard_count"])
	}
	preview, _ := data["summary_preview"].(string)
	if len(preview) == 0 {
		t.Fatalf("expected summary preview to be present")
	}
}

func setupGenerateMaterialRouter(h *Handler) http.Handler {
	router := gin.New()
	router.POST("/generate", h.GenerateMaterial)
	return router
}
