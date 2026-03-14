// Entry point for the movies API server. Sets up the database, registers routes, and starts the HTTP server.
package main

import (
	"log"
	"net/http"
)

func main() {
	db, err := connectDB()
	if err != nil {
		log.Fatal("failed to connect to database:", err)
	}
	defer db.Close()

	if err := migrate(db); err != nil {
		log.Fatal("failed to run migrations:", err)
	}

	h := &handler{db: db}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", h.health)
	mux.HandleFunc("GET /movies", h.listMovies)
	mux.HandleFunc("GET /movies/{id}", h.getMovie)
	mux.HandleFunc("POST /movies", h.createMovie)
	mux.HandleFunc("PUT /movies/{id}", h.updateMovie)
	mux.HandleFunc("DELETE /movies/{id}", h.deleteMovie)

	port := getEnv("PORT", "8080")
	log.Printf("server starting on :%s", port)
	if err := http.ListenAndServe(":"+port, withCORS(mux)); err != nil {
		log.Fatal(err)
	}
}

// withCORS adds CORS headers so the frontend can call the API from a different origin.
func withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
