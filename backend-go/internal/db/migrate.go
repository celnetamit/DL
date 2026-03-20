package db

import (
	"embed"
	"fmt"
	"io/fs"
	"path/filepath"
	"sort"
	"strings"

	"gorm.io/gorm"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

type migrationRecord struct {
	Version string `gorm:"primaryKey;type:varchar(255)"`
	Name    string `gorm:"type:varchar(255);not null"`
}

func (migrationRecord) TableName() string {
	return "schema_migrations"
}

func ApplyMigrations(database *gorm.DB) error {
	if err := database.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`).Error; err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	entries, err := fs.Glob(migrationFiles, "migrations/*.sql")
	if err != nil {
		return fmt.Errorf("list embedded migrations: %w", err)
	}
	sort.Strings(entries)

	for _, path := range entries {
		version := filepath.Base(path)

		var count int64
		if err := database.Model(&migrationRecord{}).Where("version = ?", version).Count(&count).Error; err != nil {
			return fmt.Errorf("check migration %s: %w", version, err)
		}
		if count > 0 {
			continue
		}

		body, err := migrationFiles.ReadFile(path)
		if err != nil {
			return fmt.Errorf("read migration %s: %w", version, err)
		}

		if err := database.Transaction(func(tx *gorm.DB) error {
			if err := tx.Exec(string(body)).Error; err != nil {
				return fmt.Errorf("execute migration %s: %w", version, err)
			}
			record := migrationRecord{
				Version: version,
				Name:    version,
			}
			if err := tx.Create(&record).Error; err != nil {
				return fmt.Errorf("record migration %s: %w", version, err)
			}
			return nil
		}); err != nil {
			return err
		}
	}

	return nil
}

func BaselineExistingSchema(database *gorm.DB, version string) error {
	if strings.TrimSpace(version) == "" {
		return fmt.Errorf("baseline version is required")
	}

	requiredTables := []string{
		"users",
		"roles",
		"subscriptions",
		"payments",
		"products",
		"institutions",
	}

	for _, table := range requiredTables {
		exists, err := tableExists(database, table)
		if err != nil {
			return fmt.Errorf("check table %s: %w", table, err)
		}
		if !exists {
			return fmt.Errorf("cannot baseline schema: required table %s does not exist", table)
		}
	}

	var count int64
	if err := database.Model(&migrationRecord{}).Where("version = ?", version).Count(&count).Error; err != nil {
		return fmt.Errorf("check baseline migration %s: %w", version, err)
	}
	if count > 0 {
		return nil
	}

	record := migrationRecord{
		Version: version,
		Name:    version,
	}
	if err := database.Create(&record).Error; err != nil {
		return fmt.Errorf("record baseline migration %s: %w", version, err)
	}

	return nil
}

func tableExists(database *gorm.DB, table string) (bool, error) {
	var exists bool
	err := database.Raw(`
		SELECT EXISTS (
			SELECT 1
			FROM information_schema.tables
			WHERE table_schema = current_schema()
			  AND table_name = ?
		)
	`, table).Scan(&exists).Error
	return exists, err
}
