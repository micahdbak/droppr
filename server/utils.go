package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"regexp"
)

var dropCodeRegex = regexp.MustCompile(`^[A-Z0-9]{6}$`)

type File struct {
	Name string `json:"name"`
	Size int64  `json:"size"`
	Type string `json:"type"`
}

func setCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
}

func writeHTTPError(w http.ResponseWriter, code int) {
	http.Error(w, http.StatusText(code), code)
}

func writeJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(data); err != nil {
		slog.Error("failed to encode json response", "error", err)
	}
}

func getSessionFromCookies(r *http.Request) (string, string) {
	id, err := r.Cookie("drop_id")
	if err != nil {
		return "", ""
	}

	role, err := r.Cookie("drop_role")
	if err != nil {
		return "", ""
	}

	return id.Value, role.Value
}

func insertSession(ctx context.Context, dropId string, dropRole string) error {
	_, err := db.Exec(
		ctx,
		"INSERT INTO sessions(drop_id, drop_role) VALUES ($1, $2)",
		dropId,
		dropRole,
	)
	return err
}

func selectDropWithCode(ctx context.Context, code string) (File, string, error) {
	row := db.QueryRow(
		ctx,
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

func selectNumDropsComplete(ctx context.Context) (int64, error) {
	row := db.QueryRow(
		ctx,
		"SELECT COUNT(*) FROM drops WHERE is_complete='t'",
	)

	var count int64
	err := row.Scan(&count)
	if err != nil {
		return 0, err
	}

	return count, nil
}
