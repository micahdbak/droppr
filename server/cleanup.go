package main

import (
	"net/http"
	"time"
)

// Clean up cookies
func serveCleanup(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	if r.Method != http.MethodPost {
		http.Error(w,
			http.StatusText(http.StatusBadRequest),
			http.StatusBadRequest)
		return
	}

	// delete the session_token cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "session_token",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	// delete the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	// TODO: move existing session out of the sessions table

	w.Write([]byte("OK"))
}
