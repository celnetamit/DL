package main

import (
  "log"
  "net/http"
  "os"
  "strings"
  "time"

  "lms-backend/internal/config"
  "lms-backend/internal/db"
  "lms-backend/internal/handlers"
  "lms-backend/internal/middleware"
  "lms-backend/internal/models"
  "lms-backend/internal/services"

  "github.com/gin-gonic/gin"
)

func main() {
  cfg := config.Load()
  database := db.Connect(cfg.DatabaseURL)

  if os.Getenv("AUTO_MIGRATE") != "false" {
    if err := database.AutoMigrate(
      &models.Institution{},
      // &models.User{},
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
    ); err != nil {
      log.Fatalf("failed to migrate: %v", err)
    }
  }

  handler := handlers.Handler{
    DB:     database,
    Config: cfg,
    Razorpay: services.RazorpayService{
      KeyID:     cfg.RazorpayKeyID,
      KeySecret: cfg.RazorpayKeySecret,
    },
  }

  router := gin.Default()
  router.Use(middleware.SecurityHeaders())
  router.Use(corsMiddleware(cfg.AppBaseURL))

  router.GET("/health", handler.Health)

  api := router.Group("/api/v1")
  {
    api.POST("/auth/register", middleware.RateLimit(5, 10*time.Minute), handler.Register)
    api.POST("/auth/login", middleware.RateLimit(5, 5*time.Minute), handler.Login)
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
      
      protected.GET("/analytics", middleware.RequireRole("super_admin"), handler.GetAdminAnalytics)
      protected.POST("/courses", middleware.RequireRole("instructor", "super_admin"), handler.CreateCourse)
      protected.PUT("/courses/:course_id", middleware.RequireRole("instructor", "super_admin"), handler.UpdateCourse)
      protected.DELETE("/courses/:course_id", middleware.RequireRole("instructor", "super_admin"), handler.DeleteCourse)
      protected.POST("/courses/:course_id/modules", middleware.RequireRole("instructor", "super_admin"), handler.AddModule)
      protected.PUT("/modules/:module_id", middleware.RequireRole("instructor", "super_admin"), handler.UpdateModule)
      protected.DELETE("/modules/:module_id", middleware.RequireRole("instructor", "super_admin"), handler.DeleteModule)
      protected.POST("/modules/:module_id/lessons", middleware.RequireRole("instructor", "super_admin"), handler.AddLesson)
      protected.PUT("/lessons/:lesson_id", middleware.RequireRole("instructor", "super_admin"), handler.UpdateLesson)
      protected.DELETE("/lessons/:lesson_id", middleware.RequireRole("instructor", "super_admin"), handler.DeleteLesson)
      protected.GET("/courses", handler.ListCourses)
      protected.GET("/courses/:course_id", handler.GetCourse)
      protected.POST("/progress", handler.UpdateProgress)
      protected.GET("/progress", handler.GetProgress)
      protected.GET("/ai/inactive-users", handler.InactiveUsers)
      api.GET("/ai/churn-risk/:user_id", handler.ChurnRisk)
      api.POST("/ai/generate", middleware.RequireRole("instructor", "super_admin"), middleware.RateLimit(3, 5*time.Minute), handler.GenerateMaterial)

      protected.GET("/contents", handler.ListContents)
      protected.POST("/contents", middleware.RequireRole("super_admin"), handler.CreateContent)
      protected.PUT("/contents/:content_id", middleware.RequireRole("super_admin"), handler.UpdateContent)
      protected.DELETE("/contents/:content_id", middleware.RequireRole("super_admin"), handler.DeleteContent)

      // Step 15 - Master Domain Manager
      protected.GET("/domains", handler.ListDomains)
      protected.POST("/domains", middleware.RequireRole("super_admin"), handler.CreateDomain)
      protected.POST("/domains/:id/subdomains", middleware.RequireRole("super_admin"), handler.CreateSubdomain)
      protected.DELETE("/domains/:id", middleware.RequireRole("super_admin"), handler.DeleteDomain)
      protected.DELETE("/subdomains/:sub_id", middleware.RequireRole("super_admin"), handler.DeleteSubdomain)

      // Step 16 - Product mutations
      protected.POST("/products", middleware.RequireRole("super_admin"), handler.CreateProduct)
      protected.PUT("/products/:id", middleware.RequireRole("super_admin"), handler.UpdateProduct)
      protected.DELETE("/products/:id", middleware.RequireRole("super_admin"), handler.DeleteProduct)

      // Step 4 – User management (admin)
      protected.GET("/users", middleware.RequireRole("super_admin"), handler.ListUsers)
      protected.PUT("/users/:id/role", middleware.RequireRole("super_admin"), handler.UpdateUserRole)
      protected.PUT("/users/:id/status", middleware.RequireRole("super_admin"), handler.UpdateUserStatus)

      // Step 5 – Institution management (admin)
      protected.GET("/institutions", middleware.RequireRole("super_admin"), handler.ListInstitutions)
      protected.POST("/institutions", middleware.RequireRole("super_admin"), handler.CreateInstitution)
      protected.PUT("/institutions/:id", middleware.RequireRole("super_admin"), handler.UpdateInstitution)
      protected.GET("/institutions/:id/members", middleware.RequireRole("super_admin"), handler.ListInstitutionMembers)
      protected.POST("/institutions/:institution_id/bulk-invite", middleware.RequireRole("super_admin"), handler.BulkInvite)

      // Subscription management (admin)
      protected.GET("/subscriptions/all", middleware.RequireRole("super_admin"), handler.ListAllSubscriptions)
      protected.GET("/admin/users", middleware.RequireRole("super_admin"), handler.AdminListUsers)
      protected.POST("/admin/subscriptions", middleware.RequireRole("super_admin"), handler.AdminCreateSubscription)
      protected.PUT("/admin/subscriptions/:id", middleware.RequireRole("super_admin"), handler.AdminUpdateSubscription)
      protected.DELETE("/admin/subscriptions/:id", middleware.RequireRole("super_admin"), handler.AdminDeleteSubscription)

      // Step 21 – API Settings management
      protected.GET("/settings", middleware.RequireRole("super_admin"), handler.ListSettings)
      protected.POST("/settings", middleware.RequireRole("super_admin"), handler.BulkUpsertSettings)
    }
  }

  log.Printf("server running on :%s", cfg.Port)
  if err := router.Run("0.0.0.0:" + cfg.Port); err != nil {
    log.Fatalf("server failed: %v", err)
  }
}

func corsMiddleware(allowedOrigins string) gin.HandlerFunc {
	origins := strings.Split(allowedOrigins, ",")
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
			if origins[0] == "*" {
				c.Header("Access-Control-Allow-Origin", "*")
			} else {
				c.Header("Access-Control-Allow-Origin", origin)
			}
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type")
			c.Header("Access-Control-Allow-Credentials", "true")
		}

		if strings.ToUpper(c.Request.Method) == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
