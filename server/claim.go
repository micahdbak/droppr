// claim.go

package main

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"time"
)

// ----------------------------------------------------------------

// select the drop id
func selectDropWithCode(code string) (File, string, error) {
	row := db.QueryRow(
		context.Background(),
		"SELECT id, file_name, file_size, file_type FROM drops WHERE code = $1 AND is_complete = 'f'",
		code,
	)

	var (
		id       string
		fileName string
		fileSize int64
		fileType string
	)
	err := row.Scan(&id, &fileName, &fileSize, &fileType)
	if err != nil {
		return File{"", 0, ""}, "", err
	}

	return File{fileName, fileSize, fileType}, id, nil
}

// ----------------------------------------------------------------

// Peeks at the fileinfo for a drop
func servePeek(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// ensure GET request
	if r.Method != http.MethodGet {
		writeHTTPError(&w, http.StatusBadRequest) // 400
		return
	}

	// get drop code from request path and check it against a regex
	code := r.URL.Path[10:] // /api/peek/:code
	matches, err := regexp.Match("^([A-Z0-9]{6,6})$", []byte(code))
	if err != nil || !matches {
		writeHTTPError(&w, http.StatusBadRequest) // 400
		return
	}

	file, _, err := selectDropWithCode(code)
	if err != nil {
		logWarning(r, "%v", err)
		writeHTTPError(&w, http.StatusNotFound) // 404
		return
	}

	// convert file to JSON byte array
	file_json, err := json.Marshal(file)
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError) // 500
		return
	}

	// provide file info to requester
	s := fmt.Sprintf("{\"file\":%s}", file_json)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(s))
}

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
		HttpOnly: true,                           // let JS see drop_id
	})

	// set the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "receiver",
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour), // expires in 24 hours
		HttpOnly: true,                           // let JS see drop_id
	})

	// provide file info to requester
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(file_s))
	logInfo(r, "claimed drop %s", id)
}
