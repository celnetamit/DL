package handlers

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type snsEnvelope struct {
	Type             string `json:"Type"`
	MessageID        string `json:"MessageId"`
	TopicARN         string `json:"TopicArn"`
	Subject          string `json:"Subject"`
	Message          string `json:"Message"`
	SubscribeURL     string `json:"SubscribeURL"`
	Token            string `json:"Token"`
	Timestamp        string `json:"Timestamp"`
	SignatureVersion string `json:"SignatureVersion"`
	Signature        string `json:"Signature"`
	SigningCertURL   string `json:"SigningCertURL"`
}

type sesMailPayload struct {
	Timestamp        string   `json:"timestamp"`
	MessageID        string   `json:"messageId"`
	Source           string   `json:"source"`
	SourceArn        string   `json:"sourceArn"`
	SendingAccountID string   `json:"sendingAccountId"`
	Subject          string   `json:"subject"`
	Destination      []string `json:"destination"`
}

type sesBouncePayload struct {
	BounceType     string `json:"bounceType"`
	BounceSubType  string `json:"bounceSubType"`
	Timestamp      string `json:"timestamp"`
	FeedbackID     string `json:"feedbackId"`
	DiagnosticCode string `json:"diagnosticCode"`
	Status         string `json:"status"`
}

type sesComplaintPayload struct {
	ComplaintFeedbackType string `json:"complaintFeedbackType"`
	Timestamp             string `json:"timestamp"`
	FeedbackID            string `json:"feedbackId"`
	UserAgent             string `json:"userAgent"`
}

type sesDeliveryPayload struct {
	Timestamp            string `json:"timestamp"`
	ProcessingTimeMillis int64  `json:"processingTimeMillis"`
	SMTPResponse         string `json:"smtpResponse"`
	ReportingMTA         string `json:"reportingMTA"`
}

type sesNotificationPayload struct {
	NotificationType string              `json:"notificationType"`
	EventType        string              `json:"eventType"`
	Mail             sesMailPayload      `json:"mail"`
	Bounce           sesBouncePayload    `json:"bounce"`
	Complaint        sesComplaintPayload `json:"complaint"`
	Delivery         sesDeliveryPayload  `json:"delivery"`
}

func (h *Handler) SESWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid payload", nil)
		return
	}

	var envelope snsEnvelope
	if err := json.Unmarshal(body, &envelope); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid sns payload", nil)
		return
	}

	if err := verifySNSSignature(envelope); err != nil {
		utils.JSON(c, http.StatusUnauthorized, "invalid sns signature", gin.H{"error": err.Error()})
		return
	}

	if h.Config.SESSNSTopicARN != "" && envelope.TopicARN != "" && envelope.TopicARN != h.Config.SESSNSTopicARN {
		utils.JSON(c, http.StatusForbidden, "unexpected sns topic", nil)
		return
	}

	switch envelope.Type {
	case "SubscriptionConfirmation":
		utils.JSON(c, http.StatusOK, "sns subscription confirmation received", gin.H{"subscribe_url": envelope.SubscribeURL})
		return
	case "Notification":
		if err := h.storeSESEvent(envelope); err != nil {
			utils.JSON(c, http.StatusInternalServerError, "failed to store ses event", gin.H{"error": err.Error()})
			return
		}
		utils.JSON(c, http.StatusOK, "ses event stored", gin.H{"message_id": envelope.MessageID})
		return
	default:
		utils.JSON(c, http.StatusOK, "sns event ignored", gin.H{"type": envelope.Type})
	}
}

func (h *Handler) ListEmailEvents(c *gin.Context) {
	eventTypeFilter := strings.TrimSpace(c.Query("event_type"))
	statusFilter := strings.TrimSpace(c.Query("status"))

	var events []models.EmailEvent
	query := h.DB.Order("created_at desc")
	if eventTypeFilter != "" {
		query = query.Where("event_type = ?", eventTypeFilter)
	}
	if statusFilter != "" {
		query = query.Where("status = ?", statusFilter)
	}

	if err := query.Find(&events).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch email events", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "email events", events)
}

func (h *Handler) storeSESEvent(envelope snsEnvelope) error {
	var payload sesNotificationPayload
	if err := json.Unmarshal([]byte(envelope.Message), &payload); err != nil {
		return err
	}

	eventType := firstNonEmpty(payload.EventType, payload.NotificationType)
	status := strings.ToLower(eventType)
	diagnostic := ""
	eventAt := parseSESNotificationTime(payload)
	if payload.Bounce.DiagnosticCode != "" {
		diagnostic = payload.Bounce.DiagnosticCode
	}
	if diagnostic == "" && payload.Delivery.SMTPResponse != "" {
		diagnostic = payload.Delivery.SMTPResponse
	}
	if diagnostic == "" && payload.Complaint.ComplaintFeedbackType != "" {
		diagnostic = payload.Complaint.ComplaintFeedbackType
	}

	rawPayload := datatypes.JSON([]byte(envelope.Message))
	event := models.EmailEvent{
		SNSMessageID:      envelope.MessageID,
		TopicARN:          envelope.TopicARN,
		EventType:         eventType,
		NotificationType:  firstNonEmpty(payload.NotificationType, payload.EventType),
		SESMessageID:      payload.Mail.MessageID,
		SourceEmail:       payload.Mail.Source,
		Subject:           payload.Mail.Subject,
		PrimaryRecipient:  firstRecipient(payload.Mail.Destination),
		Status:            status,
		DiagnosticMessage: diagnostic,
		EventAt:           eventAt,
		RawPayload:        rawPayload,
	}

	return h.DB.Where("sns_message_id = ?", envelope.MessageID).FirstOrCreate(&event).Error
}

func parseSESNotificationTime(payload sesNotificationPayload) *time.Time {
	raw := firstNonEmpty(payload.Delivery.Timestamp, payload.Bounce.Timestamp, payload.Complaint.Timestamp, payload.Mail.Timestamp)
	if raw == "" {
		return nil
	}
	if parsed, err := time.Parse(time.RFC3339, raw); err == nil {
		value := parsed.UTC()
		return &value
	}
	return nil
}

func firstRecipient(destinations []string) string {
	if len(destinations) == 0 {
		return ""
	}
	return destinations[0]
}

func verifySNSSignature(envelope snsEnvelope) error {
	if envelope.Signature == "" || envelope.SigningCertURL == "" || envelope.SignatureVersion == "" {
		return fmt.Errorf("missing sns signature fields")
	}

	signature, err := base64.StdEncoding.DecodeString(envelope.Signature)
	if err != nil {
		return fmt.Errorf("failed to decode sns signature")
	}

	certURL, err := validateSNSCertURL(envelope.SigningCertURL)
	if err != nil {
		return err
	}

	cert, err := fetchSNSCertificate(certURL)
	if err != nil {
		return err
	}

	signingString, err := buildSNSSigningString(envelope)
	if err != nil {
		return err
	}

	publicKey, ok := cert.PublicKey.(*rsa.PublicKey)
	if !ok {
		return fmt.Errorf("sns certificate does not contain rsa public key")
	}

	switch envelope.SignatureVersion {
	case "1":
		sum := sha1.Sum([]byte(signingString))
		if err := rsa.VerifyPKCS1v15(publicKey, crypto.SHA1, sum[:], signature); err != nil {
			return fmt.Errorf("sns signature verification failed")
		}
	case "2":
		sum := sha256.Sum256([]byte(signingString))
		if err := rsa.VerifyPKCS1v15(publicKey, crypto.SHA256, sum[:], signature); err != nil {
			return fmt.Errorf("sns signature verification failed")
		}
	default:
		return fmt.Errorf("unsupported sns signature version")
	}

	return nil
}

func validateSNSCertURL(raw string) (*url.URL, error) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return nil, fmt.Errorf("invalid sns signing cert url")
	}
	if parsed.Scheme != "https" {
		return nil, fmt.Errorf("sns signing cert url must use https")
	}
	host := strings.ToLower(parsed.Hostname())
	if !strings.HasSuffix(host, ".amazonaws.com") && host != "sns.amazonaws.com" {
		return nil, fmt.Errorf("unexpected sns signing cert host")
	}
	if !strings.Contains(parsed.Path, "SimpleNotificationService") {
		return nil, fmt.Errorf("unexpected sns signing cert path")
	}
	return parsed, nil
}

func fetchSNSCertificate(certURL *url.URL) (*x509.Certificate, error) {
	resp, err := http.Get(certURL.String())
	if err != nil {
		return nil, fmt.Errorf("failed to fetch sns signing cert")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("failed to fetch sns signing cert")
	}

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil, fmt.Errorf("failed to read sns signing cert")
	}

	block, _ := pem.Decode(body)
	if block == nil {
		return nil, fmt.Errorf("invalid sns signing cert pem")
	}
	cert, err := x509.ParseCertificate(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("invalid sns signing cert")
	}
	return cert, nil
}

func buildSNSSigningString(envelope snsEnvelope) (string, error) {
	lines := make([]string, 0, 12)
	appendField := func(key, value string) {
		if value == "" {
			return
		}
		lines = append(lines, key, value)
	}

	switch envelope.Type {
	case "Notification":
		appendField("Message", envelope.Message)
		appendField("MessageId", envelope.MessageID)
		appendField("Subject", envelope.Subject)
		appendField("Timestamp", envelope.Timestamp)
		appendField("TopicArn", envelope.TopicARN)
		appendField("Type", envelope.Type)
	case "SubscriptionConfirmation", "UnsubscribeConfirmation":
		appendField("Message", envelope.Message)
		appendField("MessageId", envelope.MessageID)
		appendField("SubscribeURL", envelope.SubscribeURL)
		appendField("Timestamp", envelope.Timestamp)
		appendField("Token", envelope.Token)
		appendField("TopicArn", envelope.TopicARN)
		appendField("Type", envelope.Type)
	default:
		return "", fmt.Errorf("unsupported sns message type")
	}

	return strings.Join(lines, "\n") + "\n", nil
}
