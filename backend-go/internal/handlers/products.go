package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"strings"

	"lms-backend/internal/models"
	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type productRequest struct {
	Name            string   `json:"name"`
	Description     string   `json:"description"`
	Price           float64  `json:"price"`
	Currency        string   `json:"currency"`
	Tier            string   `json:"tier"`
	ContentTypes    []string `json:"content_types"`
	DomainID        *string  `json:"domain_id"`
	SubdomainID     *string  `json:"subdomain_id"`
	ContentID       *string  `json:"content_id"`
	BundleDomainIDs []string `json:"bundle_domain_ids"`
	ContentIDs      []string `json:"content_ids"`
	DomainIDs       []string `json:"domain_ids"`
	Status          string   `json:"status"`
	RazorpayPlanID  *string  `json:"razorpay_plan_id"`
}

func (h *Handler) ListProducts(c *gin.Context) {
	var products []models.Product
	if err := h.DB.Order("created_at desc").Find(&products).Error; err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to fetch products", nil)
		return
	}
	for index := range products {
		h.hydrateProductRelations(&products[index])
	}
	utils.JSON(c, http.StatusOK, "fetched products successfully", products)
}

func (h *Handler) CreateProduct(c *gin.Context) {
	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}
	product := buildProductModel(req)
	if validationErr := h.validateProductRequest(product); validationErr != nil {
		utils.JSON(c, http.StatusBadRequest, validationErr.Error(), nil)
		return
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&product).Error; err != nil {
			return err
		}
		return syncProductRelations(tx, product)
	}); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to create product", nil)
		return
	}

	h.hydrateProductRelations(&product)
	utils.JSON(c, http.StatusCreated, "product created", product)
}

func (h *Handler) UpdateProduct(c *gin.Context) {
	productID := c.Param("id")
	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.JSON(c, http.StatusBadRequest, "invalid request", gin.H{"error": err.Error()})
		return
	}

	// Ensure the ID matches the URL param so Save targets the right row
	product := buildProductModel(req)
	product.ID = productID
	if validationErr := h.validateProductRequest(product); validationErr != nil {
		utils.JSON(c, http.StatusBadRequest, validationErr.Error(), nil)
		return
	}

	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(&product).Error; err != nil {
			return err
		}
		return syncProductRelations(tx, product)
	}); err != nil {
		utils.JSON(c, http.StatusInternalServerError, "failed to update product: "+err.Error(), nil)
		return
	}

	h.hydrateProductRelations(&product)
	utils.JSON(c, http.StatusOK, "product updated", product)
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
	query := h.productContentQuery(product)
	query.Distinct("contents.id").Count(&count)

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

	baseQuery := h.productContentQuery(product)

	contentType := c.Query("type")
	if contentType != "" {
		baseQuery = baseQuery.Where("contents.type = ?", contentType)
	}

	// Pagination
	var total int64
	baseQuery.Distinct("contents.id").Count(&total)

	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "10")
	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	if page < 1 {
		page = 1
	}
	if limit < 1 {
		limit = 20
	}
	offset := (page - 1) * limit

	var baseItems []models.Content
	if err := baseQuery.Distinct("contents.id").Order("contents.created_at desc").Offset(offset).Limit(limit).Find(&baseItems).Error; err != nil {
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
		"total":   total,
		"page":    page,
		"limit":   limit,
	})
}

func (h *Handler) productContentQuery(product models.Product) *gorm.DB {
	query := h.DB.Model(&models.Content{})

	if len(product.ContentTypes) > 0 {
		query = query.Where("contents.type IN ?", []string(product.ContentTypes))
	}

	switch product.Tier {
	case "content":
		query = query.Joins("JOIN product_content_links ON product_content_links.content_id = contents.id").
			Where("product_content_links.product_id = ?", product.ID)
	case "subdomain":
		if product.SubdomainID != nil {
			query = query.Joins("JOIN content_domain_links ON content_domain_links.content_id = contents.id").
				Where("content_domain_links.subdomain_id = ?", *product.SubdomainID)
		}
	case "domain":
		if product.DomainID != nil {
			query = query.Joins("JOIN content_domain_links ON content_domain_links.content_id = contents.id").
				Where("content_domain_links.domain_id = ?", *product.DomainID)
		}
	case "bundle":
		query = query.Joins("JOIN content_domain_links ON content_domain_links.content_id = contents.id").
			Joins("JOIN product_domain_links ON product_domain_links.domain_id = content_domain_links.domain_id").
			Where("product_domain_links.product_id = ?", product.ID)
	}

	return query
}

func syncProductRelations(tx *gorm.DB, product models.Product) error {
	if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductContentLink{}).Error; err != nil {
		return err
	}
	if err := tx.Where("product_id = ?", product.ID).Delete(&models.ProductDomainLink{}).Error; err != nil {
		return err
	}

	if product.ContentID != nil && *product.ContentID != "" {
		link := models.ProductContentLink{
			ProductID: product.ID,
			ContentID: *product.ContentID,
		}
		if err := tx.Create(&link).Error; err != nil {
			return err
		}
	}

	for _, domainID := range product.BundleDomainIDs {
		if domainID == "" {
			continue
		}
		link := models.ProductDomainLink{
			ProductID: product.ID,
			DomainID:  domainID,
		}
		if err := tx.Create(&link).Error; err != nil {
			return err
		}
	}

	return nil
}

func buildProductModel(req productRequest) models.Product {
	product := models.Product{
		Name:            req.Name,
		Description:     req.Description,
		Price:           req.Price,
		Currency:        req.Currency,
		Tier:            req.Tier,
		ContentTypes:    req.ContentTypes,
		DomainID:        req.DomainID,
		SubdomainID:     req.SubdomainID,
		ContentID:       req.ContentID,
		BundleDomainIDs: req.BundleDomainIDs,
		Status:          req.Status,
		RazorpayPlanID:  req.RazorpayPlanID,
		ContentIDs:      req.ContentIDs,
		DomainIDs:       req.DomainIDs,
	}
	if len(product.ContentIDs) == 0 && product.ContentID != nil && *product.ContentID != "" {
		product.ContentIDs = []string{*product.ContentID}
	}
	if len(product.DomainIDs) == 0 && len(product.BundleDomainIDs) > 0 {
		product.DomainIDs = append([]string{}, product.BundleDomainIDs...)
	}
	return product
}

func (h *Handler) hydrateProductRelations(product *models.Product) {
	if product == nil {
		return
	}

	var contentLinks []models.ProductContentLink
	if err := h.DB.Where("product_id = ?", product.ID).Order("created_at asc").Find(&contentLinks).Error; err == nil {
		product.ContentIDs = make([]string, 0, len(contentLinks))
		for _, link := range contentLinks {
			product.ContentIDs = append(product.ContentIDs, link.ContentID)
		}
		if len(product.ContentIDs) == 1 {
			product.ContentID = &product.ContentIDs[0]
		}
	}

	var domainLinks []models.ProductDomainLink
	if err := h.DB.Where("product_id = ?", product.ID).Order("created_at asc").Find(&domainLinks).Error; err == nil {
		product.DomainIDs = make([]string, 0, len(domainLinks))
		for _, link := range domainLinks {
			product.DomainIDs = append(product.DomainIDs, link.DomainID)
		}
		if len(product.DomainIDs) > 0 {
			product.BundleDomainIDs = append([]string{}, product.DomainIDs...)
		}
	}
}

func (h *Handler) validateProductRequest(product models.Product) error {
	if strings.TrimSpace(product.Name) == "" {
		return fmt.Errorf("product name is required")
	}
	if product.Price < 0 {
		return fmt.Errorf("product price cannot be negative")
	}
	if strings.TrimSpace(product.Tier) == "" {
		return fmt.Errorf("product tier is required")
	}

	contentIDs := compactStrings(product.ContentIDs)
	if len(contentIDs) == 0 && product.ContentID != nil && *product.ContentID != "" {
		contentIDs = []string{*product.ContentID}
	}
	domainIDs := compactStrings(product.DomainIDs)
	if len(domainIDs) == 0 {
		domainIDs = compactStrings([]string(product.BundleDomainIDs))
	}

	switch product.Tier {
	case "content":
		if len(contentIDs) != 1 {
			return fmt.Errorf("content products must include exactly one linked content item")
		}
		if product.DomainID != nil || product.SubdomainID != nil || len(domainIDs) > 0 {
			return fmt.Errorf("content products cannot also target domains or subdomains")
		}
	case "domain":
		if product.DomainID == nil || strings.TrimSpace(*product.DomainID) == "" {
			return fmt.Errorf("domain products must include a linked domain")
		}
		if product.SubdomainID != nil || len(contentIDs) > 0 || len(domainIDs) > 0 {
			return fmt.Errorf("domain products cannot include subdomains, bundled domains, or direct content links")
		}
	case "subdomain":
		if product.DomainID == nil || strings.TrimSpace(*product.DomainID) == "" {
			return fmt.Errorf("subdomain products must include a parent domain")
		}
		if product.SubdomainID == nil || strings.TrimSpace(*product.SubdomainID) == "" {
			return fmt.Errorf("subdomain products must include a linked subdomain")
		}
		if len(contentIDs) > 0 || len(domainIDs) > 0 {
			return fmt.Errorf("subdomain products cannot include bundled domains or direct content links")
		}
	case "bundle":
		if len(domainIDs) == 0 {
			return fmt.Errorf("bundle products must include at least one linked domain")
		}
		if product.DomainID != nil || product.SubdomainID != nil || len(contentIDs) > 0 {
			return fmt.Errorf("bundle products cannot include direct domain, subdomain, or content links")
		}
	default:
		return fmt.Errorf("invalid product tier")
	}

	if err := h.ensureDomainIDsExist(domainIDs); err != nil {
		return err
	}
	if err := h.ensureContentIDsExist(contentIDs); err != nil {
		return err
	}
	if product.DomainID != nil {
		if err := h.ensureDomainIDsExist([]string{*product.DomainID}); err != nil {
			return err
		}
	}
	if product.SubdomainID != nil {
		if err := h.ensureSubdomainExists(*product.SubdomainID, product.DomainID); err != nil {
			return err
		}
	}

	return nil
}

func (h *Handler) ensureDomainIDsExist(domainIDs []string) error {
	if len(domainIDs) == 0 {
		return nil
	}
	var count int64
	if err := h.DB.Model(&models.Domain{}).Where("id IN ?", domainIDs).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to validate domains")
	}
	if count != int64(len(domainIDs)) {
		return fmt.Errorf("one or more linked domains are invalid")
	}
	return nil
}

func (h *Handler) ensureContentIDsExist(contentIDs []string) error {
	if len(contentIDs) == 0 {
		return nil
	}
	var count int64
	if err := h.DB.Model(&models.Content{}).Where("id IN ?", contentIDs).Count(&count).Error; err != nil {
		return fmt.Errorf("failed to validate content links")
	}
	if count != int64(len(contentIDs)) {
		return fmt.Errorf("one or more linked content items are invalid")
	}
	return nil
}

func (h *Handler) ensureSubdomainExists(subdomainID string, domainID *string) error {
	var subdomain models.Subdomain
	if err := h.DB.First(&subdomain, "id = ?", subdomainID).Error; err != nil {
		return fmt.Errorf("linked subdomain is invalid")
	}
	if domainID != nil && strings.TrimSpace(*domainID) != "" && subdomain.DomainID != *domainID {
		return fmt.Errorf("linked subdomain does not belong to the selected domain")
	}
	return nil
}

func compactStrings(values []string) []string {
	seen := map[string]struct{}{}
	compacted := make([]string, 0, len(values))
	for _, value := range values {
		trimmed := strings.TrimSpace(value)
		if trimmed == "" {
			continue
		}
		if _, exists := seen[trimmed]; exists {
			continue
		}
		seen[trimmed] = struct{}{}
		compacted = append(compacted, trimmed)
	}
	return compacted
}
