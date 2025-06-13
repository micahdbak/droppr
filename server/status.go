// check.go

package main

import (
	"fmt"
	"net/http"
)

// ----------------------------------------------------------------

// Checks the status of the entire website
func serveStatus(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// ensure GET request
	if r.Method != http.MethodGet {
		writeHTTPError(&w, http.StatusBadRequest) // 400
		return
	}

	w.Header().Set("Content-Type", "application/json")

	numDrops, err := selectNumDropsComplete()
	if err != nil {
		w.Write([]byte("{\"drops\": 0}"))
		return
	}

	s := fmt.Sprintf("{\"drops\": %d}", numDrops)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(s))
}
