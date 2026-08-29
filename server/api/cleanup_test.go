package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServeCleanup(t *testing.T) {
	api, router := initTestAPI(t)

	var dropID string
	err := api.db.QueryRow(context.Background(),
		"INSERT INTO drops(code, file_name, file_size, file_type) VALUES('CLEAN1', 'item.txt', 10, 'text/plain') RETURNING id",
	).Scan(&dropID)
	if err != nil {
		t.Fatalf("insert drop failed: %v", err)
	}

	req := httptest.NewRequest("POST", "/api/cleanup", nil)
	req.AddCookie(&http.Cookie{Name: "drop_id", Value: dropID})
	req.AddCookie(&http.Cookie{Name: "drop_role", Value: "dropper"})
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	for _, c := range rr.Result().Cookies() {
		if c.MaxAge != -1 {
			t.Errorf("expected cookie %s to be expired, got maxage=%d", c.Name, c.MaxAge)
		}
	}

	var isComplete bool
	if err := api.db.QueryRow(context.Background(), "SELECT is_complete FROM drops WHERE id = $1", dropID).Scan(&isComplete); err != nil || !isComplete {
		t.Errorf("expected drop to be marked complete in database")
	}
}
