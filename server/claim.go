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
func selectDropIdWithCode(code string) (string, error) {
	rows, err := db.Query(
		context.Background(),
		"SELECT id FROM drops WHERE code = $1 AND is_complete = 'f'",
		code,
	)
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

// Claims a drop
func serveClaim(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// ensure POST request
	if r.Method != http.MethodPost {
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// get drop code from request path and check it against a regex
	code := r.URL.Path[11:] // /api/claim/:code
	matches, err := regexp.Match("^([a-zA-Z0-9]{6,6})$", []byte(code))
	if err != nil || !matches {
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// get drop ID with code; err will fire if the drop code is not for an incomplete drop
	id, err := selectDropIdWithCode(code)
	if err != nil {
		logWarning(r, "%v", err)
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// check for an existing session for this drop in cookies
	token, id_ := getSession(r)
	if len(token) > 0 && len(id_) > 0 {
		if id == id_ {
			if role, err := selectDropRoleWithTokenAndId(token, id); err == nil {
				// the requester has already claimed this drop, so pretend they just claimed it
				if role == "receiver" {
					files, err := selectFiles(id)
					if err != nil {
						logError(r, "%v", err)
						writeHTTPError(&w, http.StatusInternalServerError)
						return
					}

					// convert files array to JSON byte array
					files_json, err := json.Marshal(files)
					if err != nil {
						logError(r, "%v", err)
						writeHTTPError(&w, http.StatusInternalServerError)
						return
					}

					// provide file info to requester
					s := fmt.Sprintf("{\"fileinfo\":%s}", files_json)
					w.Header().Set("Content-Type", "application/json")
					w.Write([]byte(s))
					return
				} else {
					http.Error(w, "You cannot receive your own drop", http.StatusBadRequest)
					return
				}
			}
		}
	}

	// check if the drop is busy (someone already claimed it)
	if isBusy, err := isDropBusy(id); err != nil || isBusy {
		if err != nil {
			logError(r, "%v", err)
		}
		writeHTTPError(&w, http.StatusConflict)
		return
	}

	// insert new session for the request
	token, err = insertSession(id, "receiver")
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

	// get files for this drop
	files, err := selectFiles(id)
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError)
		return
	}

	// convert files array to JSON byte array
	files_json, err := json.Marshal(files)
	if err != nil {
		logError(r, "%v", err)
		writeHTTPError(&w, http.StatusInternalServerError)
		return
	}

	// provide file info to requester
	s := fmt.Sprintf("{\"fileinfo\":%s}", files_json)
	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(s))

	logInfo(r, "claimed drop %s", id)
}
