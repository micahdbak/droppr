package api

import (
	"log/slog"
	"net/http"
)

func (a *API) servePeek(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	code := r.PathValue("code")
	if !dropCodeRegex.MatchString(code) {
		writeHTTPError(w, http.StatusBadRequest)
		return
	}

	file, _, err := a.selectDropWithCode(r.Context(), code)
	if err != nil {
		slog.Warn("drop not found for peek", "code", code, "error", err)
		writeHTTPError(w, http.StatusNotFound)
		return
	}

	writeJSON(w, http.StatusOK, map[string]FileInfo{"file": file})
}
