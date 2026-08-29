package api

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServeStatus(t *testing.T) {
	api, router := initTestAPI(t)

	_, err := api.db.Exec(context.Background(),
		"INSERT INTO drops(id, code, file_name, file_size, file_type, is_complete) VALUES(gen_random_uuid(), 'AAAAAA', 'f.txt', 10, 'text/plain', 't')",
	)
	if err != nil {
		t.Fatalf("insert completed drop failed: %v", err)
	}

	req := httptest.NewRequest("GET", "/api/status", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp map[string]int64
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil || resp["drops"] != 1 {
		t.Errorf("expected drops: 1, got %v", resp)
	}
}
