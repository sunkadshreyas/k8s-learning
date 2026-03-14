// Database connection and schema migration for the movies API.
package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func connectDB() (*sql.DB, error) {
	dsn := os.Getenv("DATABASE_URL")
	if dsn == "" {
		dsn = fmt.Sprintf(
			"host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
			getEnv("DB_HOST", "localhost"),
			getEnv("DB_PORT", "5432"),
			getEnv("DB_USER", "postgres"),
			getEnv("DB_PASSWORD", "postgres"),
			getEnv("DB_NAME", "movies"),
		)
	}
	return sql.Open("postgres", dsn)
}

func migrate(db *sql.DB) error {
	_, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS movies (
			id          SERIAL PRIMARY KEY,
			title       VARCHAR(255) NOT NULL,
			genre       VARCHAR(100) NOT NULL DEFAULT '',
			year        INT NOT NULL DEFAULT 0,
			rating      DECIMAL(3,1) NOT NULL DEFAULT 0,
			description TEXT NOT NULL DEFAULT '',
			created_at  TIMESTAMP DEFAULT NOW()
		)
	`)
	return err
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
