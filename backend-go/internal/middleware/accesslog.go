package middleware

import (
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

func AccessLog() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		path := c.Request.URL.Path
		query := c.Request.URL.RawQuery

		c.Next()

		if path == "/health" {
			return
		}

		requestID, _ := c.Get(RequestIDKey)
		if query != "" {
			path = path + "?" + query
		}

		log.Printf(
			`request_id=%s method=%s path="%s" status=%d latency_ms=%d ip=%s user_id=%s`,
			safeLogValue(requestID),
			c.Request.Method,
			path,
			c.Writer.Status(),
			time.Since(start).Milliseconds(),
			c.ClientIP(),
			safeLogValue(c.GetString("user_id")),
		)
	}
}

func safeLogValue(value interface{}) string {
	text, ok := value.(string)
	if !ok || strings.TrimSpace(text) == "" {
		return "-"
	}
	return text
}
