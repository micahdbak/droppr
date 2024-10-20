// utils.go

package main

import (
	"context"
	"fmt"
	"net/http"
	"time"
)

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

// returns the drop role found with session token and drop id
func selectDropRoleWithTokenAndId(token string, dropId string) (string, error) {
	row := db.QueryRow(
		context.Background(),
		"SELECT drop_role FROM sessions WHERE token = $1 AND drop_id = $2",
		token,
		dropId,
	)

	var role string
	err := row.Scan(&role)
	if err != nil {
		return "", err
	}

	if role != "dropper" && role != "receiver" {
		err = fmt.Errorf("\"%s\" is not a valid drop role", role)
		return "", err
	}

	return role, nil
}

// ----------------------------------------------------------------

// a drop is considered busy if a session exists for the dropper and the receiver
func isDropBusy(dropId string) (bool, error) {
	row := db.QueryRow(
		context.Background(),
		`SELECT 
			COUNT(CASE WHEN drop_role = 'dropper' THEN 1 END) AS droppers,
			COUNT(CASE WHEN drop_role = 'receiver' THEN 1 END) AS receivers
		FROM sessions
		WHERE drop_id = $1`,
		dropId,
	)

	var droppers, receivers int
	err := row.Scan(&droppers, &receivers)
	if err != nil {
		return false, err
	}

	return droppers != 0 && receivers != 0, nil
}

// ----------------------------------------------------------------

func selectFiles(dropId string) ([]file, error) {
	rows, err := db.Query(
		context.Background(),
		"SELECT label, name, size, type FROM files WHERE drop_id = $1 ORDER BY name COLLATE \"en_US.UTF-8\" ASC",
		dropId,
	)
	if err != nil {
		return nil, err
	}

	var files []file

	for rows.Next() {
		var f file
		if err = rows.Scan(&f.Label, &f.Name, &f.Size, &f.Type); err == nil {
			files = append(files, f)
		} else {
			break
		}
	}

	rows.Close()

	if err != nil {
		return nil, err
	}

	return files, nil
}

// ----------------------------------------------------------------

// insert a row into sessions with the provided drop ID and role, returning the session token
func insertSession(dropId string, dropRole string) (string, error) {
	row := db.QueryRow(
		context.Background(),
		"INSERT INTO sessions(drop_id, drop_role) VALUES ($1, $2) RETURNING token",
		dropId,
		dropRole,
	)

	var token string
	err := row.Scan(&token)
	if err != nil {
		return "", err
	}

	return token, nil
}
