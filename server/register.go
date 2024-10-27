// register.go

package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// ----------------------------------------------------------------

// generate a drop code, 6 random characters of A-Z, 0-9
func generateDropCode() (string, error) {
	// note that B, I, O, and S are excluded, as they may be confused with 8, 1, 0, or 5.
	const charset = "ACDEFGHJKLMNPQRTUVWXYZ0123456789"
	bytes := make([]byte, 6)

	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}

	// convert each byte in bytes to a character in charset
	for i := 0; i < 6; i++ {
		b := bytes[i]
		bytes[i] = charset[int(b)%len(charset)]
	}

	return string(bytes), nil
}

// ----------------------------------------------------------------

// insert a row in the drops table with file information, returning the generated drop ID and code
func insertDrop(file File) (string, string, error) {
	// lest we enter an infinite loop, attempt this for a maximum of 5 tries
	for ctr := 0; ctr < 5; ctr++ {
		// generate a drop code to attempt inserting a row with
		code, err := generateDropCode()
		if err != nil {
			return "", "", err
		}

		row := db.QueryRow(
			context.Background(),
			"INSERT INTO drops(code, file_name, file_size, file_type) VALUES ($1, $2, $3, $4) RETURNING id",
			code,
			file.Name,
			file.Size,
			file.Type,
		)

		// below scan will error on failure
		var id string
		if err = row.Scan(&id); err == nil {
			return id, code, nil
		}
		// couldn't insert row; try again on next loop
	}

	return "", "", fmt.Errorf("couldn't insert drop after 5 tries")
}

// ----------------------------------------------------------------

// Registers a drop
func serveRegister(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// ensure POST request
	if r.Method != http.MethodPost {
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// get file information from request body
	var file File
	err := json.NewDecoder(r.Body).Decode(&file)
	if err != nil {
		// might fail if r.Body isn't JSON
		logWarning(r, "%v", err)
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// insert a drop row given the file information
	id, code, err := insertDrop(file)
	if err != nil {
		// will error if couldn't generate a free drop code
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError)
		return
	}

	// generate a new session row for this drop
	err = insertSession(id, "dropper")
	if err != nil {
		// would be really strange if this happened, as the drop ID was just generated,
		// and no client should have it yet. I.e., failure on session already existing.
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError)
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

	// set the drop_role cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "dropper",
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour), // expires in 24 hours
		HttpOnly: true,                           // let JS see drop_id
	})

	// response body has JSON object with drop_code
	s := fmt.Sprintf("{\"drop_code\":\"%s\"}", code)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(s))
	logInfo(r, "registered drop %s (%s)", id, code)
}
