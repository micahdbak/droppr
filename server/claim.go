// claim.go

package main

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

// ----------------------------------------------------------------

// Claims a drop
func serveClaim(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	code := r.PathValue("code")
	if !dropCodeRegex.MatchString(code) {
		writeHTTPError(w, http.StatusBadRequest) // 400
		return
	}

	// get file information and drop ID given the drop code
	// will error if no incomplete drop exists for the code given
	file, id, err := selectDropWithCode(code)
	if err != nil {
		slog.Error("failed to find drop with code", "code", code, "error", err)
		writeHTTPError(w, http.StatusNotFound) // 404
		return
	}

	// prepare file info response data
	file_json, err := json.Marshal(file)
	if err != nil {
		slog.Error("failed to marshal file json", "error", err)
		writeHTTPError(w, http.StatusInternalServerError) // 500
		return
	}
	file_s := fmt.Sprintf("{\"file\":%s}", file_json)

	// double check that the requester hasn't claimed this drop already
	id_, role := getSessionFromCookies(r)
	if id == id_ && role == "receiver" {
		// if yes, just provide file info to requester and move on
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(file_s))
		return
	}

	// insert new session for the request
	err = insertSession(id, "receiver")
	if err != nil {
		// someone claimed the request already; pretend it doesn't exist
		slog.Warn("failed to claim drop; already claimed", "drop_id", id, "error", err)
		writeHTTPError(w, http.StatusNotFound) // 404
		return
	}

	// set the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    id,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour), // expires in 24 hours
		HttpOnly: true,
	})

	// set the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "receiver",
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour), // expires in 24 hours
		HttpOnly: true,
	})

	// provide file info to requester
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(file_s))
	slog.Info("claimed drop", "drop_id", id, "code", code)
}
