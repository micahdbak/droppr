package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestServePeek(t *testing.T) {
	api, router := initTestAPI(t)

	_, err := api.db.Exec(context.Background(),
		"INSERT INTO drops(code, file_name, file_size, file_type) VALUES('PEEK01', 'sample.pdf', 2048, 'application/pdf')",
	)
	if err != nil {
		t.Fatalf("insert drop failed: %v", err)
	}

	req := httptest.NewRequest("GET", "/api/peek/PEEK01", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}
	if !strings.Contains(rr.Body.String(), "sample.pdf") {
		t.Errorf("expected file metadata in response, got %s", rr.Body.String())
	}
}

func TestServePeekNotFound(t *testing.T) {
	_, router := initTestAPI(t)

	req := httptest.NewRequest("GET", "/api/peek/ZZZZZZ", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rr.Code)
	}
}
