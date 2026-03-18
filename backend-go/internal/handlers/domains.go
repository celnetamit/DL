package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListDomains(c *gin.Context) {
	var domains []models.Domain
	if err := h.DB.Preload("Subdomains").Order("created_at desc").Find(&domains).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch domains", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "fetched domains successfully", domains)
}

func (h *Handler) CreateDomain(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", nil)
		return
	}

	domain := models.Domain{Name: req.Name}
	if err := h.DB.Create(&domain).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create domain: "+err.Error(), nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "domain created", domain)
}

func (h *Handler) CreateSubdomain(c *gin.Context) {
	domainID := c.Param("id")
	var req struct {
		Name string `json:"name" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", nil)
		return
	}

	subdomain := models.Subdomain{
		DomainID: domainID,
		Name:     req.Name,
	}

	if err := h.DB.Create(&subdomain).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create subdomain", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "subdomain created", subdomain)
}

func (h *Handler) DeleteDomain(c *gin.Context) {
	domainID := c.Param("id")
	if err := h.DB.Delete(&models.Domain{}, "id = ?", domainID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete domain", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "domain deleted", nil)
}

func (h *Handler) DeleteSubdomain(c *gin.Context) {
	subdomainID := c.Param("sub_id")
	if err := h.DB.Delete(&models.Subdomain{}, "id = ?", subdomainID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete subdomain", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "subdomain deleted", nil)
}
