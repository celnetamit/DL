package db

import (
  "log"

  "gorm.io/driver/postgres"
  "gorm.io/gorm"
)

func Connect(databaseURL string) *gorm.DB {
  if databaseURL == "" {
    log.Fatal("DATABASE_URL is required")
  }

  conn, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{})
  if err != nil {
    log.Fatalf("failed to connect to database: %v", err)
  }

  return conn
}
