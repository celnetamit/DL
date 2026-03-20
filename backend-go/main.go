package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"lms-backend/internal/authz"
	"lms-backend/internal/config"
	"lms-backend/internal/db"
	"lms-backend/internal/handlers"
	"lms-backend/internal/middleware"
	"lms-backend/internal/models"
	"lms-backend/internal/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
)

func main() {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Use release mode in production
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	cfg := config.Load()
	if err := cfg.Validate(); err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}
	database := db.Connect(cfg.DatabaseURL)

	if os.Getenv("AUTO_MIGRATE") != "false" {
		if err := database.AutoMigrate(
			&models.Institution{},
			&models.User{},
			&models.Role{},
			&models.Subscription{},
			&models.Payment{},
			&models.Course{},
			&models.Module{},
			&models.Lesson{},
			&models.Progress{},
			&models.Content{},
			&models.Domain{},
			&models.Subdomain{},
			&models.Product{},
			&models.AppSetting{},
			&models.AuditLog{},
			&models.ConsentHistory{},
		); err != nil {
			log.Fatalf("failed to migrate: %v", err)
		}
	}

	for _, roleName := range authz.SystemRoles() {
		database.Where("name = ?", roleName).FirstOrCreate(&models.Role{}, models.Role{Name: roleName})
	}

	// Seed default admin if missing (configurable via ADMIN_SEED_EMAIL / ADMIN_SEED_PASSWORD)
	adminEmail := os.Getenv("ADMIN_SEED_EMAIL")
	if adminEmail == "" {
		adminEmail = "admin@example.com"
	}
	adminPassword := os.Getenv("ADMIN_SEED_PASSWORD")
	if adminPassword == "" {
		adminPassword = "admin123"
	}

	var adminCount int64
	database.Model(&models.User{}).Where("email = ?", adminEmail).Count(&adminCount)
	if adminCount == 0 {
		var role models.Role
		database.Where("name = ?", authz.RoleSuperAdmin).FirstOrCreate(&role, models.Role{Name: authz.RoleSuperAdmin})

		hash, _ := bcrypt.GenerateFromPassword([]byte(adminPassword), bcrypt.DefaultCost)
		hashStr := string(hash)
		database.Create(&models.User{
			Email:        adminEmail,
			PasswordHash: &hashStr,
			FullName:     "Super Admin",
			Status:       "active",
			Roles:        []models.Role{role},
		})
		log.Printf("Seeded default super_admin account: %s", adminEmail)
	}

	// Seed Google super-admins (no password – Google login only)
	var superAdminRole models.Role
	database.Where("name = ?", authz.RoleSuperAdmin).FirstOrCreate(&superAdminRole, models.Role{Name: authz.RoleSuperAdmin})

	googleSuperAdmins := []struct{ email, name string }{
		{"puneet.mehrotra@celnet.in", "Puneet Mehrotra"},
		{"amit@conwiz.in", "Amit"},
		{"manish@celnet.in", "Manish"},
	}
	for _, sa := range googleSuperAdmins {
		var count int64
		database.Model(&models.User{}).Where("email = ?", sa.email).Count(&count)
		if count == 0 {
			u := models.User{
				Email:    sa.email,
				FullName: sa.name,
				Status:   "active",
				Roles:    []models.Role{superAdminRole},
			}
			database.Create(&u)
			log.Printf("Seeded super_admin: %s", sa.email)
		}
	}

	handler := handlers.Handler{
		DB:     database,
		Config: cfg,
		Razorpay: services.RazorpayService{
			KeyID:     cfg.RazorpayKeyID,
			KeySecret: cfg.RazorpayKeySecret,
		},
		GoogleOAuth: &oauth2.Config{
			ClientID:     cfg.GoogleClientID,
			ClientSecret: cfg.GoogleClientSecret,
			RedirectURL:  cfg.GoogleRedirectURL,
			Scopes: []string{
				"https://www.googleapis.com/auth/userinfo.email",
				"https://www.googleapis.com/auth/userinfo.profile",
			},
			Endpoint: google.Endpoint,
		},
	}

	router := gin.Default()
	if err := router.SetTrustedProxies(cfg.TrustedProxies); err != nil {
		log.Fatalf("failed to configure trusted proxies: %v", err)
	}
	router.Use(middleware.SecurityHeaders())
	router.Use(corsMiddleware(cfg.AppBaseURL))

	router.GET("/health", handler.Health)

	api := router.Group("/api/v1")
	{
		api.POST("/auth/register", middleware.RateLimit(5, 10*time.Minute), handler.Register)
		api.POST("/auth/login", middleware.RateLimit(5, 5*time.Minute), handler.Login)
		api.GET("/auth/google", handler.GoogleLogin)
		api.GET("/auth/google/callback", handler.GoogleCallback)
		api.POST("/subscriptions/webhook", handler.RazorpayWebhook)

		// Step 16 Public Routes
		api.GET("/products", handler.ListProducts)
		api.GET("/products/:id/stats", handler.GetProductStats)
		api.GET("/products/:id/contents", handler.GetProductContents)

		protected := api.Group("")
		protected.Use(middleware.JWTAuth(cfg.JwtSecret))
		{
			protected.GET("/users/me", handler.GetMe)
			protected.PUT("/users/me", handler.UpdateMe)
			protected.POST("/subscriptions/create-order", handler.CreateOrder)
			protected.POST("/subscriptions/create-subscription", handler.CreateSubscription)
			protected.GET("/subscriptions/me", handler.GetMySubscriptions)
			protected.PUT("/subscriptions/:id/cancel", handler.CancelSubscription)

			protected.GET("/analytics", middleware.RequireRole(authz.RoleSuperAdmin, authz.RoleSubscriptionManager, authz.RoleContentManager), handler.GetAdminAnalytics)
			protected.POST("/courses", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.CreateCourse)
			protected.PUT("/courses/:course_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.UpdateCourse)
			protected.DELETE("/courses/:course_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteCourse)
			protected.POST("/courses/:course_id/modules", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.AddModule)
			protected.PUT("/modules/:module_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.UpdateModule)
			protected.DELETE("/modules/:module_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteModule)
			protected.POST("/modules/:module_id/lessons", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.AddLesson)
			protected.PUT("/lessons/:lesson_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.UpdateLesson)
			protected.DELETE("/lessons/:lesson_id", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteLesson)
			protected.GET("/courses", handler.ListCourses)
			protected.GET("/courses/:course_id", handler.GetCourse)
			protected.POST("/progress", handler.UpdateProgress)
			protected.GET("/progress", handler.GetProgress)
			protected.GET("/ai/inactive-users", handler.InactiveUsers)
			api.GET("/ai/churn-risk/:user_id", handler.ChurnRisk)
			api.POST("/ai/generate", middleware.RequireRole(authz.RoleInstructor, authz.RoleContentManager, authz.RoleSuperAdmin), middleware.RateLimit(3, 5*time.Minute), handler.GenerateMaterial)

			protected.GET("/contents", handler.ListContents)
			protected.POST("/contents", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.CreateContent)
			protected.PUT("/contents/:content_id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.UpdateContent)
			protected.DELETE("/contents/:content_id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteContent)

			// Step 15 - Master Domain Manager
			protected.GET("/domains", handler.ListDomains)
			protected.POST("/domains", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.CreateDomain)
			protected.POST("/domains/:id/subdomains", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.CreateSubdomain)
			protected.DELETE("/domains/:id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteDomain)
			protected.DELETE("/subdomains/:sub_id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteSubdomain)

			// Step 16 - Product mutations
			protected.POST("/products", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.CreateProduct)
			protected.PUT("/products/:id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.UpdateProduct)
			protected.DELETE("/products/:id", middleware.RequireRole(authz.RoleContentManager, authz.RoleSuperAdmin), handler.DeleteProduct)

			// Step 4 – User management (admin)
			protected.GET("/users", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.ListUsers)
			protected.PUT("/users/:id/role", middleware.RequireRole(authz.RoleSuperAdmin), handler.UpdateUserRole)
			protected.PUT("/users/:id/status", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.UpdateUserStatus)

			// Step 5 – Institution management (admin)
			protected.GET("/institutions", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.ListInstitutions)
			protected.POST("/institutions", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.CreateInstitution)
			protected.PUT("/institutions/:id", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.UpdateInstitution)
			protected.GET("/institutions/:id/members", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.ListInstitutionMembers)
			protected.GET("/institutions/:id/overview", handler.GetInstitutionOverview)
			protected.PUT("/institutions/:id/members/:user_id/status", handler.UpdateInstitutionMemberStatus)
			protected.POST("/institutions/:institution_id/bulk-invite", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.BulkInvite)

			// Subscription management (admin)
			protected.GET("/subscriptions/all", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.ListAllSubscriptions)
			protected.GET("/admin/users", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.AdminListUsers)
			protected.POST("/admin/subscriptions", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.AdminCreateSubscription)
			protected.PUT("/admin/subscriptions/:id", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.AdminUpdateSubscription)
			protected.DELETE("/admin/subscriptions/:id", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.AdminDeleteSubscription)

			// Step 21 – API Settings management
			protected.GET("/settings", middleware.RequireRole(authz.RoleSuperAdmin), handler.ListSettings)
			protected.POST("/settings", middleware.RequireRole(authz.RoleSuperAdmin), handler.BulkUpsertSettings)

			// Compliance & DPDP act
			protected.POST("/compliance/consent", handler.GiveConsent)
			protected.GET("/compliance/export", handler.ExportMyData)
			protected.DELETE("/compliance/account", handler.DeleteMyAccount)
			protected.GET("/compliance/audit-logs", middleware.RequireRole(authz.RoleSubscriptionManager, authz.RoleSuperAdmin), handler.GetAuditLogs)
		}
	}

	log.Printf("server running on :%s", cfg.Port)
	server := &http.Server{
		Addr:              "0.0.0.0:" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
		MaxHeaderBytes:    1 << 20,
	}
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		log.Fatalf("server failed: %v", err)
	}
}

func corsMiddleware(allowedOrigins string) gin.HandlerFunc {
	origins := make([]string, 0)
	for _, origin := range strings.Split(allowedOrigins, ",") {
		trimmed := strings.TrimSpace(origin)
		if trimmed != "" {
			origins = append(origins, trimmed)
		}
	}
	if allowedOrigins == "" || allowedOrigins == "*" {
		origins = []string{"*"}
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		allow := false

		if origins[0] == "*" {
			allow = true
		} else {
			for _, o := range origins {
				if o == origin {
					allow = true
					break
				}
			}
		}

		if allow {
			c.Header("Vary", "Origin")
			if origins[0] == "*" {
				c.Header("Access-Control-Allow-Origin", "*")
			} else {
				c.Header("Access-Control-Allow-Origin", origin)
				c.Header("Access-Control-Allow-Credentials", "true")
			}
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
		}

		if strings.ToUpper(c.Request.Method) == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
