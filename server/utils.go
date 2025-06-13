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

// select the drop id
func selectNumDropsComplete() (int64, error) {
	row := db.QueryRow(
		context.Background(),
		"SELECT COUNT(*) FROM drops WHERE is_complete='t'",
	)

	var count int64
	err := row.Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}
