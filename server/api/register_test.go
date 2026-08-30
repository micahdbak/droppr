package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestServeRegister(t *testing.T) {
	_, router := initTestAPI(t)

	payload := []byte(`{"name":"file.png","size":1024,"type":"image/png"}`)
	req := httptest.NewRequest("POST", "/api/register", bytes.NewReader(payload))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var resp struct {
		DropCode string           `json:"drop_code"`
		Turn     *TurnCredentials `json:"turn"`
	}
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("invalid response body: %v", err)
	}
	if len(resp.DropCode) != 6 {
		t.Errorf("invalid drop_code in response: %v", resp)
	}
	if resp.Turn == nil || len(resp.Turn.URLs) == 0 || resp.Turn.Username == "" || resp.Turn.Credential == "" {
		t.Errorf("invalid turn credentials in response: %v", resp.Turn)
	}

	cookies := rr.Result().Cookies()
	if len(cookies) < 2 {
		t.Fatalf("expected session cookies to be set")
	}
}

func TestServeRegisterValidation(t *testing.T) {
	_, router := initTestAPI(t)

	req := httptest.NewRequest("POST", "/api/register", bytes.NewReader([]byte(`{"name":"","size":0,"type":""}`)))
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for empty payload, got %d", rr.Code)
	}
}
