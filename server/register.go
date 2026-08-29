package main

import (
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"time"
)

func generateDropCode() (string, error) {
	// note that B, I, O, and S are excluded, as they may be confused with 8, 1, 0, or 5.
	const charset = "ACDEFGHJKLMNPQRTUVWXYZ0123456789"
	bytes := make([]byte, 6)

	_, err := rand.Read(bytes)
	if err != nil {
		return "", err
	}

	for i := 0; i < 6; i++ {
		b := bytes[i]
		bytes[i] = charset[int(b)%len(charset)]
	}

	return string(bytes), nil
}

func insertDrop(ctx context.Context, file File) (string, string, error) {
	// lest we enter an infinite loop, attempt this for a maximum of 5 tries
	for ctr := 0; ctr < 5; ctr++ {
		code, err := generateDropCode()
		if err != nil {
			return "", "", err
		}

		row := db.QueryRow(
			ctx,
			"INSERT INTO drops(code, file_name, file_size, file_type) VALUES ($1, $2, $3, $4) RETURNING id",
			code,
			file.Name,
			file.Size,
			file.Type,
		)

		var id string
		if err = row.Scan(&id); err == nil {
			return id, code, nil
		}
	}

	return "", "", fmt.Errorf("couldn't insert drop after 5 tries")
}

func serveRegister(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	var file File
	err := json.NewDecoder(r.Body).Decode(&file)
	if err != nil {
		slog.Warn("invalid register request body", "error", err)
		writeHTTPError(w, http.StatusBadRequest)
		return
	}

	if file.Name == "" || file.Size <= 0 || file.Type == "" {
		slog.Warn("invalid file payload in register request", "file", file)
		writeHTTPError(w, http.StatusBadRequest)
		return
	}

	id, code, err := insertDrop(r.Context(), file)
	if err != nil {
		slog.Error("failed to generate/insert drop", "error", err)
		writeHTTPError(w, http.StatusInternalServerError)
		return
	}

	err = insertSession(r.Context(), id, "dropper")
	if err != nil {
		slog.Error("failed to insert session for drop", "drop_id", id, "error", err)
		writeHTTPError(w, http.StatusInternalServerError)
		return
	}

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    id,
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "dropper",
		Path:     "/",
		Expires:  time.Now().Add(24 * time.Hour),
		HttpOnly: true,
	})

	writeJSON(w, http.StatusOK, map[string]string{"drop_code": code})
	slog.Info("registered drop", "drop_id", id, "code", code)
}
