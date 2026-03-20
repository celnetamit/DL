package handlers

import (
	"log"
	"net/http"
	"strings"
	"time"

	"lms-backend/internal/authz"
	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type registerRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
	FullName string `json:"full_name" binding:"required"`
	Role     string `json:"role"`
	Code     string `json:"code"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type sessionMeta struct {
	CanRevert     bool     `json:"can_revert"`
	SwitchedRole  string   `json:"switched_role,omitempty"`
	OriginalRoles []string `json:"original_roles,omitempty"`
}

type authResponse struct {
	Token string      `json:"token"`
	User  interface{} `json:"user"`
}

func (h *Handler) buildAuthUser(c *gin.Context, user models.User, effectiveRoles []string) gin.H {
	roleObjects := make([]models.Role, 0, len(effectiveRoles))
	for _, role := range effectiveRoles {
		roleObjects = append(roleObjects, models.Role{Name: role})
	}
	user.Roles = roleObjects

	response := gin.H{
		"id":             user.ID,
		"email":          user.Email,
		"full_name":      user.FullName,
		"status":         user.Status,
		"google_id":      user.GoogleID,
		"avatar_url":     user.AvatarURL,
		"last_login_at":  user.LastLoginAt,
		"last_active_at": user.LastActiveAt,
		"institution_id": user.InstitutionID,
		"institution":    user.Institution,
		"created_at":     user.CreatedAt,
		"updated_at":     user.UpdatedAt,
		"roles":          user.Roles,
		"consent_given":  user.ConsentGiven,
		"consent_at":     user.ConsentAt,
	}

	originalRolesValue, hasOriginalRoles := c.Get("original_roles")
	switchedRoleValue, hasSwitchedRole := c.Get("switched_role")
	originalRoles := authz.NormalizeRoleClaims(originalRolesValue)
	if hasOriginalRoles && hasSwitchedRole && len(originalRoles) > 0 {
		switchedRole, _ := switchedRoleValue.(string)
		response["session"] = sessionMeta{
			CanRevert:     true,
			OriginalRoles: originalRoles,
			SwitchedRole:  switchedRole,
		}
	}

	return response
}

func (h *Handler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	var existing models.User
	if err := h.DB.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		utils.JSON(c, http.StatusConflict, "email already registered", nil)
		return
	}

	passwordHash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to secure password", nil)
		return
	}

	hashStr := string(passwordHash)
	user := models.User{
		Email:        req.Email,
		PasswordHash: &hashStr,
		FullName:     req.FullName,
		Status:       "active",
	}

	roleName := req.Role
	if roleName == "" {
		roleName = authz.RoleStudent
	}

	allowedSelfRoles := map[string]struct{}{}
	for _, role := range authz.SelfRegisterableRoles() {
		allowedSelfRoles[role] = struct{}{}
	}
	if _, ok := allowedSelfRoles[roleName]; !ok {
		utils.JSON(c, http.StatusBadRequest, "invalid public registration role", gin.H{
			"allowed_roles": authz.SelfRegisterableRoles(),
		})
		return
	}

	var role models.Role
	if err := h.DB.Where("name = ?", roleName).First(&role).Error; err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid role", nil)
		return
	}

	// B2B Multi-tenant linking
	var inst models.Institution
	linkedInstitution := false
	if req.Code != "" {
		if err := h.DB.Where("code = ?", req.Code).First(&inst).Error; err == nil {
			user.InstitutionID = &inst.ID
			linkedInstitution = true
		}
	} else {
		parts := strings.Split(req.Email, "@")
		if len(parts) == 2 {
			domain := parts[1]
			if err := h.DB.Where("domain = ?", domain).First(&inst).Error; err == nil {
				user.InstitutionID = &inst.ID
				linkedInstitution = true
			}
		}
	}

	if linkedInstitution && inst.StudentLimit > 0 {
		var memberCount int64
		if err := h.DB.Model(&models.User{}).Where("institution_id = ?", inst.ID).Count(&memberCount).Error; err == nil && memberCount >= int64(inst.StudentLimit) {
			utils.JSON(c, http.StatusForbidden, "institution student limit reached", gin.H{
				"institution_id": inst.ID,
				"student_limit":  inst.StudentLimit,
			})
			return
		}
	}

	if err := h.DB.Create(&user).Error; err != nil {
		log.Printf("DB error creating user: %v", err)
		utils.JSON(c, http.StatusInternalServerError, "failed to create user", nil)
		return
	}

	if err := h.DB.Model(&user).Association("Roles").Append(&role); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to assign role", nil)
		return
	}

	token, err := h.createToken(user.ID, []string{role.Name})
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create token", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "registered", authResponse{Token: token, User: h.buildAuthUser(c, user, []string{role.Name})})

	// Audit Log
	h.LogActivity(c, &user.ID, "REGISTER", "USER", user.ID, "New user registered")
}

func (h *Handler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	var user models.User
	if err := h.DB.Preload("Roles").Where("email = ?", req.Email).First(&user).Error; err != nil {
		h.LogActivity(c, nil, "LOGIN_FAILURE", "USER", req.Email, "User not found")
		utils.JSON(c, http.StatusUnauthorized, "invalid credentials", nil)
		return
	}

	if user.PasswordHash == nil {
		utils.JSON(c, http.StatusUnauthorized, "account uses Google sign-in, no password set", nil)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
		h.LogActivity(c, &user.ID, "LOGIN_FAILURE", "USER", user.ID, "Invalid password")
		utils.JSON(c, http.StatusUnauthorized, "invalid credentials", nil)
		return
	}

	now := time.Now().UTC()
	h.DB.Model(&user).Updates(map[string]interface{}{
		"last_login_at":  now,
		"last_active_at": now,
	})

	roleNames := make([]string, 0, len(user.Roles))
	for _, role := range user.Roles {
		roleNames = append(roleNames, role.Name)
	}

	token, err := h.createToken(user.ID, roleNames)
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create token", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "logged in", authResponse{Token: token, User: h.buildAuthUser(c, user, roleNames)})

	// Audit Log
	h.LogActivity(c, &user.ID, "LOGIN_SUCCESS", "USER", user.ID, "User logged in via password")
}

func (h *Handler) createToken(userID string, roles []string) (string, error) {
	return h.createTokenWithExtras(userID, roles, nil)
}

func (h *Handler) createTokenWithExtras(userID string, roles []string, extras map[string]interface{}) (string, error) {
	claims := jwt.MapClaims{
		"sub":   userID,
		"roles": roles,
		"exp":   time.Now().Add(24 * time.Hour).Unix(),
		"iat":   time.Now().Unix(),
	}
	for key, value := range extras {
		claims[key] = value
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.Config.JwtSecret))
}

func (h *Handler) SwitchRole(c *gin.Context) {
	currentUserID := c.GetString("user_id")
	roleClaims := authz.NormalizeRoleClaims(c.MustGet("roles"))
	if !authz.HasAnyRole(roleClaims, authz.RoleSuperAdmin) {
		utils.JSON(c, http.StatusForbidden, "only super admins can switch roles", nil)
		return
	}

	var req struct {
		Role string `json:"role" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if req.Role == authz.RoleSuperAdmin {
		utils.JSON(c, http.StatusBadRequest, "use your original session for super admin access", nil)
		return
	}

	validRole := false
	for _, role := range authz.SystemRoles() {
		if req.Role == role {
			validRole = true
			break
		}
	}
	if !validRole {
		utils.JSON(c, http.StatusBadRequest, "invalid role", nil)
		return
	}

	var user models.User
	if err := h.DB.Preload("Institution").First(&user, "id = ?", currentUserID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "user not found", nil)
		return
	}

	token, err := h.createTokenWithExtras(user.ID, []string{req.Role}, map[string]interface{}{
		"original_roles": roleClaims,
		"switched_role":  req.Role,
		"actor_id":       currentUserID,
	})
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create switch-role token", nil)
		return
	}

	c.Set("original_roles", roleClaims)
	c.Set("switched_role", req.Role)
	utils.JSON(c, http.StatusOK, "role switched", authResponse{Token: token, User: h.buildAuthUser(c, user, []string{req.Role})})
}

func (h *Handler) RevertRole(c *gin.Context) {
	currentUserID := c.GetString("user_id")
	originalRolesValue, _ := c.Get("original_roles")
	originalRoles := authz.NormalizeRoleClaims(originalRolesValue)
	if len(originalRoles) == 0 {
		utils.JSON(c, http.StatusBadRequest, "session is not using a switched role", nil)
		return
	}
	if !authz.HasAnyRole(originalRoles, authz.RoleSuperAdmin) {
		utils.JSON(c, http.StatusForbidden, "only original super admin sessions can revert", nil)
		return
	}

	var user models.User
	if err := h.DB.Preload("Institution").Preload("Roles").First(&user, "id = ?", currentUserID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "user not found", nil)
		return
	}

	token, err := h.createToken(user.ID, originalRoles)
	if err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to restore original role token", nil)
		return
	}

	utils.JSON(c, http.StatusOK, "role reverted", authResponse{Token: token, User: h.buildAuthUser(c, user, originalRoles)})
}
