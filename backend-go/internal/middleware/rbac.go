package middleware

import (
  "net/http"

  "github.com/gin-gonic/gin"
)

func RequireRole(allowed ...string) gin.HandlerFunc {
  allowedSet := make(map[string]struct{}, len(allowed))
  for _, role := range allowed {
    allowedSet[role] = struct{}{}
  }

  return func(c *gin.Context) {
    rolesValue, ok := c.Get("roles")
    if !ok {
      c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "missing role"})
      return
    }

    roles := normalizeRoles(rolesValue)
    for _, role := range roles {
      if _, exists := allowedSet[role]; exists {
        c.Next()
        return
      }
    }

    c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"success": false, "message": "insufficient permissions"})
  }
}

func normalizeRoles(value interface{}) []string {
  switch v := value.(type) {
  case []string:
    return v
  case []interface{}:
    roles := make([]string, 0, len(v))
    for _, item := range v {
      if role, ok := item.(string); ok {
        roles = append(roles, role)
      }
    }
    return roles
  default:
    return nil
  }
}
