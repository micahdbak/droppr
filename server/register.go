package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
)

// ----------------------------------------------------------------

type file struct {
	Label string `json:"label"`
	Name  string `json:"name"`
	Size  int64  `json:"size"`
	Type  string `json:"type"`
}

// ----------------------------------------------------------------

// generate a drop code, 6 random characters of A-Z, 0-9
func generateDropCode() (string, error) {
	const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
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

// insert a row in the drops table setting the drop code, returning the generated drop id
func insertDrop(code string) (string, error) {
	rows, err := db.Query(context.Background(), "INSERT INTO drops(code) VALUES ($1) RETURNING id", code)
	if err != nil || !rows.Next() {
		if err == nil {
			err = fmt.Errorf("query returned zero rows")
		}
		return "", err
	}

	var id string
	err = rows.Scan(&id)
	rows.Close()

	// just to be safe
	if err != nil {
		return "", err
	}

	return id, nil
}

// ----------------------------------------------------------------

// insert a slice of files into the files table, populating the Label fields afterwards
func insertFiles(files []file, dropId string) error {
	_, err := db.CopyFrom(
		context.Background(),
		pgx.Identifier{"files"},
		[]string{"label", "drop_id", "name", "size", "type"},
		pgx.CopyFromSlice(len(files), func(i int) ([]any, error) {
			return []any{files[i].Label, dropId, files[i].Name, files[i].Size, files[i].Type}, nil
		}),
	)

	return err // entire COPY fails if one row violates a column constraint
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

	// ensure request body is JSON
	contentType := r.Header.Get("Content-Type")
	if contentType != "" {
		mediaType := strings.ToLower(strings.TrimSpace(strings.Split(contentType, ";")[0]))
		if mediaType != "application/json" {
			writeHTTPError(&w, http.StatusBadRequest)
			return
		}
	}

	// get fileinfo from request body
	var files []file
	err := json.NewDecoder(r.Body).Decode(&files)
	if err != nil {
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	id := ""   // drop ID
	code := "" // drop code

	// iterate until a drop code is valid
	for ctr := 0; len(id) == 0; ctr++ {
		var err error
		code, err = generateDropCode()

		// lest we get an infinite loop otherwise
		if err != nil || ctr > 10 { // 10 is an arbitrary upper limit
			logError(r, "couldn't get a drop code")
			writeHTTPError(&w, http.StatusInternalServerError)
			return
		}

		id, err = insertDrop(code)
		if err != nil {
			logWarning(r, "%v", err)
		}
		// len(id) == 0 when err != nil; hence loop
	}

	// !!!!
	// TODO: perform insertDrop, insertFiles, and insertSession using the same transaction
	//       it should be that either they all successfully insert or none of them do
	// !!!!

	// insert file rows
	if err := insertFiles(files, id); err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// generate a new session row for this drop
	token, err := insertSession(id, "dropper")
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError)
		return
	}

	// set the session_token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    token,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour), // expires in 24 hours
		HttpOnly: true,                           // don't let JS see session_token
	})

	// set the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    id,
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
