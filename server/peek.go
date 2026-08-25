// peek.go

package main

import (
	"log/slog"
	"net/http"
)

// ----------------------------------------------------------------

// Peeks at the fileinfo for a drop
func servePeek(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	code := r.PathValue("code")
	if !dropCodeRegex.MatchString(code) {
		writeHTTPError(w, http.StatusBadRequest) // 400
		return
	}

	file, _, err := selectDropWithCode(code)
	if err != nil {
		slog.Warn("drop not found for peek", "code", code, "error", err)
		writeHTTPError(w, http.StatusNotFound) // 404
		return
	}

	writeJSON(w, http.StatusOK, FileResponse{File: file})
}
