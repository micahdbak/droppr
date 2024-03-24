package main

import (
	"sc/agent"
	"log"
	"net/http"
)

func main() {
	var a agent.Agent
	a.Init()

	http.HandleFunc("/ping", a.ServePing)
	log.Fatal(http.ListenAndServe(":5050", nil))
}
