// Data models for the movies API.
package main

import "time"

type Movie struct {
	ID          int       `json:"id"`
	Title       string    `json:"title"`
	Genre       string    `json:"genre"`
	Year        int       `json:"year"`
	Rating      float64   `json:"rating"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
}
