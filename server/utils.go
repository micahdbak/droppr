package main

import (
	"crypto/rand"
	"net/http"
)

// generate a drop ID, 6 random characters of A-Z, 0-9
func generateDropId() (string, error) {
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

// get the session token and drop ID from cookies
func getSession(r *http.Request) (string, string) {
	// get session token from cookies
	token, err := r.Cookie("session_token")
	if err != nil {
		return "", ""
	}

	// get drop ID from cookies
	id, err := r.Cookie("drop_id")
	if err != nil {
		return "", ""
	}

	// return the existing session
	return token.Value, id.Value
}

// set necessary CORS header(s) in HTTP response
func setCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
}
