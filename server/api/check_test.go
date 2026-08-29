package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServeCheck(t *testing.T) {
	_, router := initTestAPI(t)

	req := httptest.NewRequest("GET", "/api/check", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200 for clean session, got %d", rr.Code)
	}

	reqWithCookie := httptest.NewRequest("GET", "/api/check", nil)
	reqWithCookie.AddCookie(&http.Cookie{Name: "drop_id", Value: "active-drop"})
	reqWithCookie.AddCookie(&http.Cookie{Name: "drop_role", Value: "dropper"})
	rrWithCookie := httptest.NewRecorder()
	router.ServeHTTP(rrWithCookie, reqWithCookie)

	if rrWithCookie.Code != http.StatusConflict {
		t.Errorf("expected 409 for existing session, got %d", rrWithCookie.Code)
	}
}
