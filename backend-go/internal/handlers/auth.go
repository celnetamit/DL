package handlers

import (
  "log"
  "net/http"
  "strings"
  "time"

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
    roleName = "student"
  }

  var role models.Role
  if err := h.DB.Where("name = ?", roleName).First(&role).Error; err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid role", nil)
    return
  }

  // B2B Multi-tenant linking
  var inst models.Institution
  if req.Code != "" {
    if err := h.DB.Where("code = ?", req.Code).First(&inst).Error; err == nil {
      user.InstitutionID = &inst.ID
    }
  } else {
    parts := strings.Split(req.Email, "@")
    if len(parts) == 2 {
       domain := parts[1]
       if err := h.DB.Where("domain = ?", domain).First(&inst).Error; err == nil {
         user.InstitutionID = &inst.ID
       }
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

  utils.JSON(c, http.StatusCreated, "registered", gin.H{"token": token, "user": user})
}

func (h *Handler) Login(c *gin.Context) {
  var req loginRequest
  if err := c.ShouldBindJSON(&req); err != nil {
    utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
    return
  }

  var user models.User
  if err := h.DB.Preload("Roles").Where("email = ?", req.Email).First(&user).Error; err != nil {
    utils.JSON(c, http.StatusUnauthorized, "invalid credentials", nil)
    return
  }

  if user.PasswordHash == nil {
    utils.JSON(c, http.StatusUnauthorized, "account uses Google sign-in, no password set", nil)
    return
  }
  if err := bcrypt.CompareHashAndPassword([]byte(*user.PasswordHash), []byte(req.Password)); err != nil {
    utils.JSON(c, http.StatusUnauthorized, "invalid credentials", nil)
    return
  }

  now := time.Now().UTC()
  h.DB.Model(&user).Updates(map[string]interface{}{
    "last_login_at": now,
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

  utils.JSON(c, http.StatusOK, "logged in", gin.H{"token": token, "user": user})
}

func (h *Handler) createToken(userID string, roles []string) (string, error) {
  claims := jwt.MapClaims{
    "sub":   userID,
    "roles": roles,
    "exp":   time.Now().Add(24 * time.Hour).Unix(),
    "iat":   time.Now().Unix(),
  }
  token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
  return token.SignedString([]byte(h.Config.JwtSecret))
}
