package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/models"
)

type LeadWebhookService struct {
	URL        string
	Secret     string
	CompanyID  string
	WebsiteURL string
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
	if s.CompanyID == "" {
		return "", fmt.Errorf("lead company id is not configured")
	}

	payload, err := json.Marshal(map[string]interface{}{
		"companyId":        s.CompanyID,
		"name":             event.FullName,
		"email":            event.Email,
		"phone":            event.Phone,
		"organizationName": event.InstitutionName,
		"source":           leadSourceLabel(event.Source),
		"formName":         leadFormName(event.Source, event.LeadType),
		"website":          s.WebsiteURL,
		"notes":            leadNotes(event),
	})
	if err != nil {
		return "", err
	}

	req, err := http.NewRequest(http.MethodPost, s.URL, bytes.NewReader(payload))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	if s.Secret != "" {
		req.Header.Set("Authorization", "Bearer "+s.Secret)
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

func leadSourceLabel(source string) string {
	switch source {
	case "contact_form":
		return "WEBSITE"
	case "pricing_page":
		return "WEBSITE"
	default:
		return "WEBSITE"
	}
}

func leadFormName(source, leadType string) string {
	switch source {
	case "contact_form":
		return "Contact Form"
	case "pricing_page":
		return "Purchase Request Form"
	default:
		if leadType == "purchase_request" {
			return "Purchase Request Form"
		}
		return "Lead Form"
	}
}

func leadNotes(event models.LeadEvent) string {
	parts := make([]string, 0, 5)
	if event.Subject != "" {
		parts = append(parts, "Subject: "+event.Subject)
	}
	if event.Message != "" {
		parts = append(parts, "Message: "+event.Message)
	}
	if event.ProductName != "" {
		parts = append(parts, "Product: "+event.ProductName)
	}
	if event.PlanCode != "" {
		parts = append(parts, "Plan Code: "+event.PlanCode)
	}
	if event.Amount != nil {
		parts = append(parts, fmt.Sprintf("Quoted Amount: %d %s", *event.Amount, event.Currency))
	}
	return strings.Join(parts, " | ")
}
