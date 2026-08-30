package api

import (
	"context"
	"net/http"
	"os"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initTestAPI(t *testing.T) (*API, *http.ServeMux) {
	t.Helper()
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/droppr_test"
	}

	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("database connection failed: %v", err)
	}

	if _, err := db.Exec(context.Background(), "DELETE FROM sessions; DELETE FROM drops;"); err != nil {
		t.Fatalf("database cleanup failed: %v", err)
	}

	api := New(db, TurnConfig{Secret: "test-secret", URLs: []string{"turn:localhost:3478?transport=udp"}})
	mux := http.NewServeMux()
	api.RegisterRoutes(mux)
	return api, mux
}
