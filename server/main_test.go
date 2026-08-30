package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"server/api"
	"server/signaling"

	"github.com/jackc/pgx/v5/pgxpool"
)

func TestSetupRouter(t *testing.T) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/droppr_test"
	}

	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("Unable to connect to database: %v", err)
	}
	defer db.Close()

	apiHandler := api.New(db, api.TurnConfig{})
	sig := signaling.NewServer()
	router := setupRouter(apiHandler, sig)

	req, _ := http.NewRequest("GET", "/api/check", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("expected 200 from /api/check, got %v", status)
	}

	reqStatus, _ := http.NewRequest("GET", "/api/status", nil)
	rrStatus := httptest.NewRecorder()
	router.ServeHTTP(rrStatus, reqStatus)

	if status := rrStatus.Code; status != http.StatusOK {
		t.Errorf("expected 200 from /api/status, got %v", status)
	}

	reqSC, _ := http.NewRequest("GET", "/sc", nil)
	rrSC := httptest.NewRecorder()
	router.ServeHTTP(rrSC, reqSC)

	if status := rrSC.Code; status != http.StatusUnauthorized {
		t.Errorf("expected 401 from unauthorized /sc, got %v", status)
	}
}
