// check.go

package main

import (
	"net/http"
)

// ----------------------------------------------------------------

// Checks if the requester is doing a drop
func serveCheck(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	// double check that the requester hasn't claimed this drop already
	id, role := getSessionFromCookies(r)
	if len(id) > 0 || len(role) > 0 {
		writeHTTPError(w, http.StatusConflict) // 409
		return
	}

	// 200, OK
}
