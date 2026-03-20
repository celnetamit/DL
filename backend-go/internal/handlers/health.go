package handlers

import (
	"context"
	"net/http"
	"time"

	"lms-backend/internal/utils"

	"github.com/gin-gonic/gin"
)

func (h *Handler) Health(c *gin.Context) {
	sqlDB, err := h.DB.DB()
	if err != nil {
		utils.JSON(c, http.StatusServiceUnavailable, "database unavailable", gin.H{
			"service": "backend-go",
			"db":      "down",
		})
		return
	}

	ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
	defer cancel()

	if err := sqlDB.PingContext(ctx); err != nil {
		utils.JSON(c, http.StatusServiceUnavailable, "database unavailable", gin.H{
			"service": "backend-go",
			"db":      "down",
		})
		return
	}

	utils.JSON(c, http.StatusOK, "ok", gin.H{
		"service": "backend-go",
		"db":      "up",
	})
}
