package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

type RazorpayService struct {
	KeyID     string
	KeySecret string
}

func (s RazorpayService) CreateCustomer(name, email string) (map[string]interface{}, error) {
	if s.KeyID == "" || s.KeySecret == "" {
		return nil, errors.New("razorpay keys not configured")
	}

	payload := map[string]interface{}{
		"name":  name,
		"email": email,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "https://api.razorpay.com/v1/customers", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.KeyID, s.KeySecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("razorpay error: %v", result)
	}

	return result, nil
}

func (s RazorpayService) CreateSubscription(planID string, totalCount int, customerID string) (map[string]interface{}, error) {
	if s.KeyID == "" || s.KeySecret == "" {
		return nil, errors.New("razorpay keys not configured")
	}

	payload := map[string]interface{}{
		"plan_id":     planID,
		"total_count": totalCount,
	}
	if customerID != "" {
		payload["customer_id"] = customerID
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "https://api.razorpay.com/v1/subscriptions", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.KeyID, s.KeySecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("razorpay error: %v", result)
	}

	return result, nil
}

func (s RazorpayService) CreateOrder(amount int, currency string, receipt string) (map[string]interface{}, error) {
	if s.KeyID == "" || s.KeySecret == "" {
		return nil, errors.New("razorpay keys not configured")
	}

	payload := map[string]interface{}{
		"amount":   amount,
		"currency": currency,
		"receipt":  receipt,
	}
	body, _ := json.Marshal(payload)

	req, err := http.NewRequest("POST", "https://api.razorpay.com/v1/orders", bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.KeyID, s.KeySecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("razorpay error: %v", result)
	}

	return result, nil
}

func (s RazorpayService) CancelSubscription(subscriptionID string) (map[string]interface{}, error) {
	if s.KeyID == "" || s.KeySecret == "" {
		return nil, errors.New("razorpay keys not configured")
	}

	req, err := http.NewRequest("POST", "https://api.razorpay.com/v1/subscriptions/"+subscriptionID+"/cancel", nil)
	if err != nil {
		return nil, err
	}
	req.SetBasicAuth(s.KeyID, s.KeySecret)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("razorpay error: %v", result)
	}

	return result, nil
}

func VerifySignature(body []byte, signature string, secret string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}

func VerifyPaymentSignature(orderID, paymentID, signature, secret string) bool {
	if orderID == "" || paymentID == "" || signature == "" || secret == "" {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(orderID + "|" + paymentID))
	expected := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(expected), []byte(signature))
}
