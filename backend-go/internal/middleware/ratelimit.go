package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

type client struct {
	lastSeen time.Time
	count    int
}

var (
	mu      sync.Mutex
	clients = make(map[string]*client)
)

func RateLimit(limit int, window time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		defer mu.Unlock()

		if _, found := clients[ip]; !found {
			clients[ip] = &client{lastSeen: time.Now(), count: 1}
			c.Next()
			return
		}

		if time.Since(clients[ip].lastSeen) > window {
			clients[ip].lastSeen = time.Now()
			clients[ip].count = 1
			c.Next()
			return
		}

		if clients[ip].count >= limit {
			c.JSON(http.StatusTooManyRequests, gin.H{"error": "Too many requests. Please slow down."})
			c.Abort()
			return
		}

		clients[ip].count++
		c.Next()
	}
}
