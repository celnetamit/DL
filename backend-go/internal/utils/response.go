package utils

import "github.com/gin-gonic/gin"

type APIResponse struct {
  Success bool        `json:"success"`
  Message string      `json:"message"`
  Data    interface{} `json:"data,omitempty"`
}

func JSON(c *gin.Context, status int, message string, data interface{}) {
  c.JSON(status, APIResponse{
    Success: status < 400,
    Message: message,
    Data:    data,
  })
}
