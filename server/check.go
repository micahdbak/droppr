package main

import (
	"net/http"
)

func serveCheck(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	id, role := getSessionFromCookies(r)
	if len(id) > 0 || len(role) > 0 {
		writeHTTPError(w, http.StatusConflict) // 409
		return
	}
}
