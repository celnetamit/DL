package handlers

import (
	"encoding/csv"
	"net/http"
	"strings"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// GET /institutions – list all institutions
func (h *Handler) ListInstitutions(c *gin.Context) {
	var institutions []models.Institution
	if err := h.DB.Find(&institutions).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to list institutions", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "institutions", institutions)
}

// POST /institutions – create a new institution
func (h *Handler) CreateInstitution(c *gin.Context) {
	var req struct {
		Name   string `json:"name" binding:"required"`
		Domain string `json:"domain"`
		Code   string `json:"code"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if req.Status == "" {
		req.Status = "active"
	}

	inst := models.Institution{
		Name:   req.Name,
		Domain: req.Domain,
		Code:   req.Code,
		Status: req.Status,
	}
	if err := h.DB.Create(&inst).Error; err != nil {
		utils.JSON(c, http.StatusConflict, "failed to create institution (code or domain may already exist)", nil)
		return
	}
	utils.JSON(c, http.StatusCreated, "institution created", inst)
}

// PUT /institutions/:id – update an institution
func (h *Handler) UpdateInstitution(c *gin.Context) {
	id := c.Param("id")

	var req struct {
		Name   string `json:"name"`
		Domain string `json:"domain"`
		Code   string `json:"code"`
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	updates := map[string]interface{}{}
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Domain != "" {
		updates["domain"] = req.Domain
	}
	if req.Code != "" {
		updates["code"] = req.Code
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}

	if err := h.DB.Model(&models.Institution{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update institution", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "institution updated", gin.H{"id": id})
}

// GET /institutions/:id/members – list members of an institution
func (h *Handler) ListInstitutionMembers(c *gin.Context) {
	id := c.Param("id")

	var users []models.User
	if err := h.DB.Preload("Roles").Where("institution_id = ?", id).Find(&users).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to list members", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "members", users)
}



// POST /institutions/:institution_id/bulk-invite – CSV upload to create student accounts
func (h *Handler) BulkInvite(c *gin.Context) {
	institutionID := c.Param("institution_id")

	var inst models.Institution
	if err := h.DB.First(&inst, "id = ?", institutionID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "institution not found", nil)
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "csv file is required", nil)
		return
	}
	defer file.Close()

	reader := csv.NewReader(file)
	records, err := reader.ReadAll()
	if err != nil {
		utils.JSON(c, http.StatusBadRequest, "failed to parse csv", nil)
		return
	}

	var role models.Role
	h.DB.Where("name = ?", "student").First(&role)

	imported := 0
	for i, row := range records {
		if i == 0 || len(row) < 2 {
			continue
		}
		email := strings.TrimSpace(row[0])
		name := strings.TrimSpace(row[1])
		if email == "" || name == "" {
			continue
		}

		var count int64
		h.DB.Model(&models.User{}).Where("email = ?", email).Count(&count)
		if count > 0 {
			continue
		}

		defaultPass, _ := bcrypt.GenerateFromPassword([]byte("student123"), bcrypt.DefaultCost)
		user := models.User{
			Email:         email,
			FullName:      name,
			PasswordHash:  string(defaultPass),
			Status:        "active",
			InstitutionID: &inst.ID,
		}
		if err := h.DB.Create(&user).Error; err == nil {
			h.DB.Model(&user).Association("Roles").Append(&role)
			imported++
		}
	}

	utils.JSON(c, http.StatusOK, "import complete", gin.H{"imported_count": imported})
}
