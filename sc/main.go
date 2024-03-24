package main

import (
	"fmt"
	"log"
	"net/http"
	"sc/agent"
)

func main() {
	fmt.Printf("Droppr.\n")

	var a agent.Agent
	a.Init()

	http.HandleFunc("/ping", a.ServePing)
	log.Fatal(http.ListenAndServe(":5050", nil))
}
