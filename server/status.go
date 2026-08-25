// status.go

package main

import (
	"net/http"
)

// ----------------------------------------------------------------

// Checks the status of the entire website
func serveStatus(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	numDrops, err := selectNumDropsComplete()
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]int64{"drops": 0})
		return
	}

	writeJSON(w, http.StatusOK, map[string]int64{"drops": numDrops})
}
