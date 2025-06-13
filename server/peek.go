// peek.go

package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
)

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
