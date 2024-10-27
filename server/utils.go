// utils.go

package main

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

// ----------------------------------------------------------------

type File struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"`
}

// ----------------------------------------------------------------

// set necessary CORS header(s) in HTTP response
func setCORS(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
}

// ----------------------------------------------------------------

// performs http.Error with http.StatusText(code)
func writeHTTPError(w *http.ResponseWriter, code int) {
	http.Error(*w, http.StatusText(code), code)
}

// ----------------------------------------------------------------

func logPlain(format string, a ...any) {
	var arglist []any
	arglist = append(arglist, time.Now().Format("2006-01-02 15:04:05"))
	arglist = append(arglist, a...)

	fmt.Printf("%s: "+format+"\n", arglist...)
}

// ----------------------------------------------------------------

func logInfo(r *http.Request, format string, a ...any) {
	var arglist []any
	arglist = append(arglist, time.Now().Format("2006-01-02 15:04:05"))
	arglist = append(arglist, r.URL.Path)
	arglist = append(arglist, a...)

	fmt.Printf("%s: [Info] in request to %s: "+format+"\n", arglist...)
}

// ----------------------------------------------------------------

func logWarning(r *http.Request, format string, a ...any) {
	var arglist []any
	arglist = append(arglist, time.Now().Format("2006-01-02 15:04:05"))
	arglist = append(arglist, r.URL.Path)
	arglist = append(arglist, a...)

	fmt.Printf("%s: [Warning] in request to %s: "+format+"\n", arglist...)
}

// ----------------------------------------------------------------

func logError(r *http.Request, format string, a ...any) {
	var arglist []any
	arglist = append(arglist, time.Now().Format("2006-01-02 15:04:05"))
	arglist = append(arglist, r.URL.Path)
	arglist = append(arglist, a...)

	fmt.Printf("%s: [Error] in request to %s: "+format+"\n", arglist...)
}

// ----------------------------------------------------------------

// get the drop ID and drop role from cookies
func getSessionFromCookies(r *http.Request) (string, string) {
	// get drop ID from cookies
	id, err := r.Cookie("drop_id")
	if err != nil {
		return "", ""
	}

	// get drop role from cookies
	role, err := r.Cookie("drop_role")
	if err != nil {
		return "", ""
	}

	// return the existing session
	return id.Value, role.Value
}

// ----------------------------------------------------------------

// insert a row into sessions with the provided drop ID and role, returning the session token
func insertSession(dropId string, dropRole string) error {
	_, err := db.Exec(
		context.Background(),
		"INSERT INTO sessions(drop_id, drop_role) VALUES ($1, $2)",
		dropId,
		dropRole,
	)
	if err != nil {
		return err
	}

	return nil
}
