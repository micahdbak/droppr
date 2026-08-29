package api

import (
	"log/slog"
	"net/http"
	"time"
)

func (a *API) serveClaim(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	code := r.PathValue("code")
	if !dropCodeRegex.MatchString(code) {
		writeHTTPError(w, http.StatusBadRequest)
		return
	}

	file, id, err := a.selectDropWithCode(r.Context(), code)
	if err != nil {
		slog.Error("failed to find drop with code", "code", code, "error", err)
		writeHTTPError(w, http.StatusNotFound)
		return
	}

	id_, role := getSessionFromCookies(r)
	if id == id_ && role == "receiver" {
		writeJSON(w, http.StatusOK, map[string]File{"file": file})
		return
	}

	err = a.insertSession(r.Context(), id, "receiver")
	if err != nil {
		// someone claimed the request already; pretend it doesn't exist
		slog.Warn("failed to claim drop; already claimed", "drop_id", id, "error", err)
		writeHTTPError(w, http.StatusNotFound)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    id,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "receiver",
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	writeJSON(w, http.StatusOK, map[string]File{"file": file})
	slog.Info("claimed drop", "drop_id", id, "code", code)
}
