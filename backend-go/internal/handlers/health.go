package handlers

import (
  "net/http"

  "lms-backend/internal/utils"

  "github.com/gin-gonic/gin"
)

func (h *Handler) Health(c *gin.Context) {
  utils.JSON(c, http.StatusOK, "ok", gin.H{"service": "backend-go"})
}
