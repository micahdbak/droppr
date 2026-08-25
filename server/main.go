// main.go

package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// shared database connection
var db *pgxpool.Pool

func main() {
	signalChannels = make(map[string]*signalChannel)

	slog.Info("~~ droppr server ~~")

	// connect to database
	var err error
	db, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}
	defer db.Close()

	// do a test query to make sure the db connection is live and good
	row := db.QueryRow(context.Background(), "SELECT 'Hello from postgres!'::text AS text")
	var dbText string
	err = row.Scan(&dbText)
	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}
	slog.Info("database connection established", "db_response", dbText)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/check", serveCheck)
	mux.HandleFunc("POST /api/claim/{code}", serveClaim)
	mux.HandleFunc("POST /api/cleanup", serveCleanup)
	mux.HandleFunc("GET /api/peek/{code}", servePeek)
	mux.HandleFunc("POST /api/register", serveRegister)
	mux.HandleFunc("GET /api/status", serveStatus)
	mux.HandleFunc("GET /sc", serveSignalChannel)

	log.Fatal(http.ListenAndServe(":5050", mux))
}
