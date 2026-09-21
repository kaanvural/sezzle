package main

import (
	"log"
	"net/http"
	"os"
)

func newMux(staticDir string) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("POST /api/v1/calculate", handleCalculate)
	mux.HandleFunc("GET /healthz", handleHealth)
	if staticDir != "" {
		mux.Handle("/", http.FileServer(http.Dir(staticDir)))
	}
	return mux
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("calculator service listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, newMux(os.Getenv("STATIC_DIR"))))
}
