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

	http.HandleFunc("/api/check", serveCheck)
	http.HandleFunc("/api/claim/", serveClaim)
	http.HandleFunc("/api/cleanup", serveCleanup)
	http.HandleFunc("/api/peek/", servePeek)
	http.HandleFunc("/api/register", serveRegister)
	http.HandleFunc("/api/status", serveStatus)
	http.HandleFunc("/sc", serveSignalChannel)

	log.Fatal(http.ListenAndServe(":5050", nil))
}
