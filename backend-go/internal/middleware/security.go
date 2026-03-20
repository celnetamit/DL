package middleware

import (
	"strings"

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

		// Conservative API-safe CSP.
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none';")

		// Strict Transport Security should only be sent for HTTPS requests.
		if c.Request.TLS != nil || strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
			c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		}

		// Restrict unused browser APIs
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)")
		c.Header("Cross-Origin-Opener-Policy", "same-origin")
		c.Header("Cross-Origin-Resource-Policy", "same-site")
		c.Header("X-Permitted-Cross-Domain-Policies", "none")

		c.Next()
	}
}
