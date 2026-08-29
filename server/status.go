package main

import (
	"net/http"
)

func serveStatus(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	numDrops, err := selectNumDropsComplete(r.Context())
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]int64{"drops": 0})
		return
	}

	writeJSON(w, http.StatusOK, map[string]int64{"drops": numDrops})
}
