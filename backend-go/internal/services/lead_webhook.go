package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"lms-backend/internal/models"
)

type LeadWebhookService struct {
	URL        string
	Secret     string
	HTTPClient *http.Client
}

func (s LeadWebhookService) client() *http.Client {
	if s.HTTPClient != nil {
		return s.HTTPClient
	}
	return &http.Client{Timeout: 10 * time.Second}
}

func (s LeadWebhookService) Enabled() bool {
	return s.URL != ""
}

func (s LeadWebhookService) Send(event models.LeadEvent) (string, error) {
	if !s.Enabled() {
		return "", fmt.Errorf("CRM webhook is not configured")
	}

	payload, err := json.Marshal(map[string]interface{}{
		"event": "lead.created",
		"lead":  event,
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, s.URL, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Lead-Event", "lead.created")

	if s.Secret != "" {
		mac := hmac.New(sha256.New, []byte(s.Secret))
		mac.Write(payload)
		req.Header.Set("X-Lead-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	}

	res, err := s.client().Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()

	buf := new(bytes.Buffer)
	if _, err := buf.ReadFrom(res.Body); err != nil {
		return "", err
	}

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return buf.String(), fmt.Errorf("CRM webhook returned status %d", res.StatusCode)
	}

	return buf.String(), nil
}
