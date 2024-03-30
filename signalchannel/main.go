// Copyright (C) 2024 droppr. All rights reserved.
//

package main

import (
	"fmt"
	"log"
	"net/http"
	"signalchannel/agent"
)

func main() {
	fmt.Printf("droppr - Peer to peer file transfer service.\n")

	var a agent.Agent
	a.Init()

	http.HandleFunc("/drop/", a.ServeDropper)
	http.HandleFunc("/receive/", a.ServeRecipient)

	log.Fatal(http.ListenAndServe(":5050", nil))
}
