package handlers

import (
	"net/http"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) ListProducts(c *gin.Context) {
	var products []models.Product
	if err := h.DB.Order("created_at desc").Find(&products).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch products", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "fetched products successfully", products)
}

func (h *Handler) CreateProduct(c *gin.Context) {
	var req models.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	if err := h.DB.Create(&req).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create product", nil)
		return
	}

	utils.JSON(c, http.StatusCreated, "product created", req)
}

func (h *Handler) UpdateProduct(c *gin.Context) {
	productID := c.Param("id")
	var req models.Product
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	// Ensure the ID matches the URL param so Save targets the right row
	req.ID = productID

	if err := h.DB.Save(&req).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update product: "+err.Error(), nil)
		return
	}

	utils.JSON(c, http.StatusOK, "product updated", req)
}

func (h *Handler) DeleteProduct(c *gin.Context) {
	productID := c.Param("id")
	if err := h.DB.Delete(&models.Product{}, "id = ?", productID).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to delete product", nil)
		return
	}
	utils.JSON(c, http.StatusOK, "product deleted", nil)
}

func (h *Handler) GetProductStats(c *gin.Context) {
	productID := c.Param("id")
	var product models.Product
	if err := h.DB.First(&product, "id = ?", productID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "product not found", nil)
		return
	}

	var count int64
	query := h.DB.Model(&models.Content{})

	if len(product.ContentTypes) > 0 {
		query = query.Where("type IN ?", []string(product.ContentTypes))
	}

	switch product.Tier {
	case "content":
		if product.ContentID != nil {
			query = query.Where("id = ?", *product.ContentID)
		}
	case "subdomain":
		if product.SubdomainID != nil {
			query = query.Where("metadata->>'subdomain' = (SELECT name FROM subdomains WHERE id = ?)", *product.SubdomainID)
		}
	case "domain":
		if product.DomainID != nil {
			query = query.Where("metadata->>'domain' = (SELECT name FROM domains WHERE id = ?)", *product.DomainID)
		}
	case "bundle":
		if len(product.BundleDomainIDs) > 0 {
			query = query.Where("metadata->>'domain' IN (SELECT name FROM domains WHERE id IN ?)", product.BundleDomainIDs)
		}
	}

	query.Count(&count)

	utils.JSON(c, http.StatusOK, "product stats", gin.H{"content_count": count})
}

// GetProductContents returns content grouped by type as virtual modules
func (h *Handler) GetProductContents(c *gin.Context) {
	productID := c.Param("id")
	var product models.Product
	if err := h.DB.First(&product, "id = ?", productID).Error; err != nil {
		utils.JSON(c, http.StatusNotFound, "product not found", nil)
		return
	}

	baseQuery := h.DB.Model(&models.Content{})

	switch product.Tier {
	case "content":
		if product.ContentID != nil {
			baseQuery = baseQuery.Where("id = ?", *product.ContentID)
		}
	case "subdomain":
		if product.SubdomainID != nil {
			baseQuery = baseQuery.Where("metadata->>'subdomain' = (SELECT name FROM subdomains WHERE id = ?)", *product.SubdomainID)
		}
	case "domain":
		if product.DomainID != nil {
			baseQuery = baseQuery.Where("metadata->>'domain' = (SELECT name FROM domains WHERE id = ?)", *product.DomainID)
		}
	case "bundle":
		if len(product.BundleDomainIDs) > 0 {
			baseQuery = baseQuery.Where("metadata->>'domain' IN (SELECT name FROM domains WHERE id IN ?)", product.BundleDomainIDs)
		}
	}

	if len(product.ContentTypes) > 0 {
		baseQuery = baseQuery.Where("type IN ?", []string(product.ContentTypes))
	}

	var baseItems []models.Content
	if err := baseQuery.Order("type, created_at desc").Find(&baseItems).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch contents", nil)
		return
	}

	// Group into virtual modules by content type
	type Module struct {
		Type     string           `json:"type"`
		Contents []models.Content `json:"contents"`
	}
	modules := []Module{}
	seen := map[string]int{} // type -> index in modules
	for _, item := range baseItems {
		if idx, ok := seen[item.Type]; ok {
			modules[idx].Contents = append(modules[idx].Contents, item)
		} else {
			seen[item.Type] = len(modules)
			modules = append(modules, Module{Type: item.Type, Contents: []models.Content{item}})
		}
	}

	utils.JSON(c, http.StatusOK, "product contents", gin.H{
		"product": product,
		"modules": modules,
	})
}
