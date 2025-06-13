// claim.go

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"time"
)

// ----------------------------------------------------------------

// Claims a drop
func serveClaim(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// ensure POST request
	if r.Method != http.MethodPost {
		writeHTTPError(&w, http.StatusBadRequest) // 400
		return
	}

	// get drop code from request path and check it against a regex
	code := r.URL.Path[11:] // /api/claim/:code
	matches, err := regexp.Match("^([A-Z0-9]{6,6})$", []byte(code))
	if err != nil || !matches {
		writeHTTPError(&w, http.StatusBadRequest) // 400
		return
	}

	// get file information and drop ID given the drop code
	// will error if no incomplete drop exists for the code given
	file, id, err := selectDropWithCode(code)
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusNotFound) // 404
		return
	}

	// prepare file info response data
	file_json, err := json.Marshal(file)
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError) // 500
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
		logWarning(r, "%v", err)
		writeHTTPError(&w, http.StatusNotFound) // 404
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
	logInfo(r, "claimed drop %s", id)
}
