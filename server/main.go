package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"

	_ "github.com/lib/pq"
)

// shared database connection
var db *sql.DB

func init() {
	signalChannels = make(map[string]*signalChannel)
}

func main() {
	fmt.Printf("droppr - Peer to peer file transfer service.\n")

	var err error
	db, err = sql.Open("postgres", "dbname=droppr sslmode=disable")
	if err != nil {
		fmt.Printf("Error: %v\n", err)
		return
	}

	http.HandleFunc("/api/register", serveRegister)
	http.HandleFunc("/api/claim/", serveClaim)
	http.HandleFunc("/api/cleanup", serveCleanup)
	http.HandleFunc("/sc", serveSignalChannel)

	log.Fatal(http.ListenAndServe(":5050", nil))
}
