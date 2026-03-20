package middleware

import (
	"net/http"

	"lms-backend/internal/authz"

	"github.com/gin-gonic/gin"
)

func RequireRole(allowed ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		rolesValue, ok := c.Get("roles")
		if !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "missing role"})
			return
		}

		roles := authz.NormalizeRoleClaims(rolesValue)
		if authz.HasAnyRole(roles, allowed...) {
			c.Next()
			return
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "insufficient permissions"})
	}
}
