package services

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sesv2"
	sestypes "github.com/aws/aws-sdk-go-v2/service/sesv2/types"
	"github.com/aws/aws-sdk-go-v2/service/sns"
	"github.com/aws/aws-sdk-go-v2/service/sns/types"
)

type NotificationService struct {
	SES              *sesv2.Client
	SNS              *sns.Client
	FromEmail        string
	ConfigurationSet string
	AlertTopicARN    string
	AppBaseURL       string
}

func NewNotificationService(ctx context.Context, region, fromEmail, configurationSet, alertTopicARN, appBaseURL string) (*NotificationService, error) {
	if region == "" {
		return &NotificationService{
			FromEmail:        fromEmail,
			ConfigurationSet: configurationSet,
			AlertTopicARN:    alertTopicARN,
			AppBaseURL:       appBaseURL,
		}, nil
	}

	cfg, err := awsconfig.LoadDefaultConfig(ctx, awsconfig.WithRegion(region))
	if err != nil {
		return nil, err
	}

	return &NotificationService{
		SES:              sesv2.NewFromConfig(cfg),
		SNS:              sns.NewFromConfig(cfg),
		FromEmail:        fromEmail,
		ConfigurationSet: configurationSet,
		AlertTopicARN:    alertTopicARN,
		AppBaseURL:       appBaseURL,
	}, nil
}

func (s *NotificationService) CanSendEmail() bool {
	return s != nil && s.SES != nil && s.FromEmail != ""
}

func (s *NotificationService) CanPublishAlerts() bool {
	return s != nil && s.SNS != nil && s.AlertTopicARN != ""
}

func (s *NotificationService) SendEmail(ctx context.Context, toAddress, subject, textBody, htmlBody string) error {
	if !s.CanSendEmail() || strings.TrimSpace(toAddress) == "" {
		return nil
	}

	input := &sesv2.SendEmailInput{
		FromEmailAddress: &s.FromEmail,
		Destination: &sestypes.Destination{
			ToAddresses: []string{toAddress},
		},
		Content: &sestypes.EmailContent{
			Simple: &sestypes.Message{
				Subject: &sestypes.Content{Data: &subject},
				Body: &sestypes.Body{
					Text: &sestypes.Content{Data: &textBody},
					Html: &sestypes.Content{Data: &htmlBody},
				},
			},
		},
	}
	if s.ConfigurationSet != "" {
		input.ConfigurationSetName = &s.ConfigurationSet
	}

	_, err := s.SES.SendEmail(ctx, input)
	return err
}

func (s *NotificationService) PublishAlert(ctx context.Context, subject string, payload map[string]interface{}) error {
	if !s.CanPublishAlerts() {
		return nil
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	_, err = s.SNS.Publish(ctx, &sns.PublishInput{
		TopicArn: &s.AlertTopicARN,
		Subject:  &subject,
		Message:  stringPointer(string(body)),
		MessageAttributes: map[string]types.MessageAttributeValue{
			"channel": {
				DataType:    stringPointer("String"),
				StringValue: stringPointer("application"),
			},
		},
	})
	return err
}

func (s *NotificationService) SendLeadAcknowledgement(ctx context.Context, name, toAddress, formName string) error {
	subject := fmt.Sprintf("We received your %s", strings.ToLower(formName))
	textBody := fmt.Sprintf("Hello %s,\n\nWe received your %s and our team will get back to you shortly.\n\nWebsite: %s\n", fallbackName(name), strings.ToLower(formName), s.AppBaseURL)
	htmlBody := fmt.Sprintf("<p>Hello %s,</p><p>We received your <strong>%s</strong> and our team will get back to you shortly.</p><p>Website: <a href=\"%s\">%s</a></p>", fallbackName(name), formName, s.AppBaseURL, s.AppBaseURL)
	return s.SendEmail(ctx, toAddress, subject, textBody, htmlBody)
}

func (s *NotificationService) SendCheckoutConfirmation(ctx context.Context, name, toAddress, productName string) error {
	subject := "Your purchase was confirmed"
	textBody := fmt.Sprintf("Hello %s,\n\nYour purchase for %s was confirmed and access has been activated.\n\nYou can sign in here: %s/dashboard\n", fallbackName(name), firstNonEmptyValue(productName, "your selected product"), s.AppBaseURL)
	htmlBody := fmt.Sprintf("<p>Hello %s,</p><p>Your purchase for <strong>%s</strong> was confirmed and access has been activated.</p><p><a href=\"%s/dashboard\">Open your dashboard</a></p>", fallbackName(name), firstNonEmptyValue(productName, "your selected product"), s.AppBaseURL)
	return s.SendEmail(ctx, toAddress, subject, textBody, htmlBody)
}

func stringPointer(value string) *string {
	return &value
}

func fallbackName(name string) string {
	if strings.TrimSpace(name) == "" {
		return "there"
	}
	return name
}

func firstNonEmptyValue(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}
