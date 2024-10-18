package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
)

// shared database connection
var db *pgxpool.Pool

func init() {
	signalChannels = make(map[string]*signalChannel)
}

func main() {
	logPlain("~~ droppr server ~~")

	var err error
	db, err = pgxpool.New(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}
	defer db.Close()

	rows, err := db.Query(context.Background(), "SELECT 'Hello from postgres!'::text AS text")
	if err != nil || !rows.Next() {
		panic(fmt.Sprintf("%v", err))
	}

	var dbText string
	err = rows.Scan(&dbText)
	rows.Close()

	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}

	logPlain("%s", dbText)

	http.HandleFunc("/api/register", serveRegister)
	http.HandleFunc("/api/claim/", serveClaim)
	http.HandleFunc("/api/cleanup", serveCleanup)
	http.HandleFunc("/sc", serveSignalChannel)

	log.Fatal(http.ListenAndServe(":5050", nil))
}
