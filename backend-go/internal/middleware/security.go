package middleware

import (
	"github.com/gin-gonic/gin"
)

func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Prevent framing (Clickjacking)
		c.Header("X-Frame-Options", "DENY")
		
		// Prevent sniffing
		c.Header("X-Content-Type-Options", "nosniff")
		
		// XSS protection for older browsers
		c.Header("X-XSS-Protection", "1; mode=block")
		
		// Referrer Policy
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		
		// Content Security Policy (Basic)
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' https://checkout.razorpay.com; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://api.razorpay.com;")

		// Strict Transport Security (HSTS) - Only in HTTPS
		// c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains")

		c.Next()
	}
}
