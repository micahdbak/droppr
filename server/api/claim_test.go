package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServeClaim(t *testing.T) {
	api, router := initTestAPI(t)

	_, err := api.db.Exec(context.Background(),
		"INSERT INTO drops(code, file_name, file_size, file_type) VALUES('CLAIM1', 'doc.txt', 500, 'text/plain')",
	)
	if err != nil {
		t.Fatalf("insert drop failed: %v", err)
	}

	req := httptest.NewRequest("POST", "/api/claim/CLAIM1", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	reqDup := httptest.NewRequest("POST", "/api/claim/CLAIM1", nil)
	rrDup := httptest.NewRecorder()
	router.ServeHTTP(rrDup, reqDup)
	if rrDup.Code != http.StatusNotFound {
		t.Errorf("expected 404 for duplicate claim, got %d", rrDup.Code)
	}
}
