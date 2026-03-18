package middleware

import (
  "net/http"
  "strings"

  "github.com/gin-gonic/gin"
  "github.com/golang-jwt/jwt/v5"
)

func JWTAuth(secret string) gin.HandlerFunc {
  return func(c *gin.Context) {
    authHeader := c.GetHeader("Authorization")
    if authHeader == "" {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "missing authorization header"})
      return
    }

    parts := strings.SplitN(authHeader, " ", 2)
    if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid authorization header"})
      return
    }

    token, err := jwt.Parse(parts[1], func(token *jwt.Token) (interface{}, error) {
      return []byte(secret), nil
    })
    if err != nil || !token.Valid {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid token"})
      return
    }

    claims, ok := token.Claims.(jwt.MapClaims)
    if !ok {
      c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"success": false, "message": "invalid claims"})
      return
    }

    c.Set("user_id", claims["sub"])
    c.Set("roles", claims["roles"])
    c.Next()
  }
}
