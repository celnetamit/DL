package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

// googleUserInfo is the profile returned by the Google userinfo API.
type googleUserInfo struct {
	Sub        string `json:"sub"`
	Email      string `json:"email"`
	Name       string `json:"name"`
	Picture    string `json:"picture"`
	Verified   bool   `json:"email_verified"`
}

// GET /api/v1/auth/google  – redirect to Google consent screen
func (h *Handler) GoogleLogin(c *gin.Context) {
	if h.GoogleOAuth == nil || h.GoogleOAuth.ClientID == "" {
		utils.JSON(c, http.StatusServiceUnavailable, "Google OAuth is not configured", nil)
		return
	}
	// "state" is a random value to protect against CSRF; for simplicity we use a fixed value here.
	// In production consider storing it in a short-lived cookie.
	url := h.GoogleOAuth.AuthCodeURL("lms-state-random")
	c.Redirect(http.StatusTemporaryRedirect, url)
}

// GET /api/v1/auth/google/callback  – exchange code, upsert user, return JWT
func (h *Handler) GoogleCallback(c *gin.Context) {
	if h.GoogleOAuth == nil || h.GoogleOAuth.ClientID == "" {
		utils.JSON(c, http.StatusServiceUnavailable, "Google OAuth is not configured", nil)
		return
	}

	code := c.Query("code")
	if code == "" {
		utils.JSON(c, http.StatusBadRequest, "missing code parameter", nil)
		return
	}

	// Exchange auth code for tokens
	token, err := h.GoogleOAuth.Exchange(context.Background(), code)
	if err != nil {
		utils.JSON(c, http.StatusUnauthorized, "failed to exchange code: "+err.Error(), nil)
		return
	}

	// Fetch Google user profile
	client := h.GoogleOAuth.Client(context.Background(), token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch user info", nil)
		return
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var gUser googleUserInfo
	if err := json.Unmarshal(body, &gUser); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to parse user info", nil)
		return
	}

	if !gUser.Verified {
		utils.JSON(c, http.StatusUnauthorized, "Google email not verified", nil)
		return
	}

	// Upsert: find existing user by GoogleID or email
	var user models.User
	result := h.DB.Preload("Roles").Where("google_id = ?", gUser.Sub).First(&user)
	if result.Error != nil {
		// Try by email (pre-seeded super-admin or previously registered)
		result2 := h.DB.Preload("Roles").Where("email = ?", gUser.Email).First(&user)
		if result2.Error != nil {
			// Brand new user – create with student role
			var studentRole models.Role
			h.DB.Where("name = ?", "student").FirstOrCreate(&studentRole, models.Role{Name: "student"})

			user = models.User{
				Email:     gUser.Email,
				FullName:  gUser.Name,
				Status:    "active",
				GoogleID:  &gUser.Sub,
				AvatarURL: &gUser.Picture,
				Roles:     []models.Role{studentRole},
			}
			if err := h.DB.Create(&user).Error; err != nil {
				utils.JSON(c, http.StatusInternalServerError, "failed to create user", nil)
				return
			}
			// Reload with roles
			h.DB.Preload("Roles").First(&user, "id = ?", user.ID)
		} else {
			// Existing email-based user: link their Google ID + avatar
			h.DB.Model(&user).Updates(map[string]interface{}{
				"google_id":  gUser.Sub,
				"avatar_url": gUser.Picture,
			})
			user.GoogleID = &gUser.Sub
			user.AvatarURL = &gUser.Picture
		}
	}

	// Update last login timestamps
	now := time.Now().UTC()
	h.DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at":  now,
		"last_active_at": now,
	})

	// Build role slice for JWT claim
	roleNames := make([]string, 0, len(user.Roles))
	for _, r := range user.Roles {
		roleNames = append(roleNames, r.Name)
	}

	jwt, err := h.createToken(user.ID, roleNames)
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create token", nil)
		return
	}

	// Redirect to frontend callback page with the token in query param
	redirectURL := fmt.Sprintf("%s/auth/callback?token=%s", h.Config.AppBaseURL, jwt)
	c.Redirect(http.StatusTemporaryRedirect, redirectURL)
}
