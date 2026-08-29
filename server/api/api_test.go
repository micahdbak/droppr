package api

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"
)

func initTestAPI(t *testing.T) (*API, *http.ServeMux) {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://localhost:5432/droppr_test"
	}

	db, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		t.Fatalf("Unable to connect to database: %v", err)
	}

	_, err = db.Exec(context.Background(), "DELETE FROM sessions; DELETE FROM drops;")
	if err != nil {
		t.Fatalf("Failed to clear tables: %v", err)
	}

	apiHandler := New(db)
	mux := http.NewServeMux()
	apiHandler.RegisterRoutes(mux)
	return apiHandler, mux
}

func TestServeCheck(t *testing.T) {
	_, router := initTestAPI(t)

	req, _ := http.NewRequest("GET", "/api/check", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)
	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}

	reqPost, _ := http.NewRequest("POST", "/api/check", nil)
	rrPost := httptest.NewRecorder()
	router.ServeHTTP(rrPost, reqPost)
	if status := rrPost.Code; status != http.StatusMethodNotAllowed && status != http.StatusBadRequest {
		t.Errorf("Error Path (Non-GET): expected 405 or 400, got %v", status)
	}

	reqCookies, _ := http.NewRequest("GET", "/api/check", nil)
	reqCookies.AddCookie(&http.Cookie{Name: "drop_id", Value: "test-id-123"})
	reqCookies.AddCookie(&http.Cookie{Name: "drop_role", Value: "dropper"})
	rrCookies := httptest.NewRecorder()
	router.ServeHTTP(rrCookies, reqCookies)
	if status := rrCookies.Code; status != http.StatusConflict {
		t.Errorf("Error Path (Has Cookies): expected 409, got %v", status)
	}
}

func TestServeStatus(t *testing.T) {
	apiHandler, router := initTestAPI(t)

	_, err := apiHandler.db.Exec(context.Background(), "INSERT INTO drops(id, code, file_name, file_size, file_type, is_complete) VALUES(gen_random_uuid(), 'AAAAAA', 'test.txt', 100, 'text/plain', 't')")
	if err != nil {
		t.Fatalf("Failed to insert drop: %v", err)
	}

	req, _ := http.NewRequest("GET", "/api/status", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}
	var resp map[string]int64
	if err := json.Unmarshal(rr.Body.Bytes(), &resp); err != nil || resp["drops"] != 1 {
		t.Errorf("Happy Path: expected {'drops': 1}, got %s", rr.Body.String())
	}

	reqPost, _ := http.NewRequest("POST", "/api/status", nil)
	rrPost := httptest.NewRecorder()
	router.ServeHTTP(rrPost, reqPost)
	if status := rrPost.Code; status != http.StatusMethodNotAllowed && status != http.StatusBadRequest {
		t.Errorf("Error Path (Non-GET): expected 405 or 400, got %v", status)
	}
}

func TestServeRegister(t *testing.T) {
	_, router := initTestAPI(t)

	fileData := File{Name: "test.pdf", Size: 1024, Type: "application/pdf"}
	body, _ := json.Marshal(fileData)
	req, _ := http.NewRequest("POST", "/api/register", bytes.NewBuffer(body))
	rr := httptest.NewRecorder()

	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}

	var resp map[string]string
	json.Unmarshal(rr.Body.Bytes(), &resp)
	if _, ok := resp["drop_code"]; !ok {
		t.Errorf("Happy Path: expected drop_code in response")
	}

	cookies := rr.Result().Cookies()
	var dropID, dropRole string
	for _, c := range cookies {
		if c.Name == "drop_id" {
			dropID = c.Value
		}
		if c.Name == "drop_role" {
			dropRole = c.Value
		}
	}
	if dropID == "" || dropRole != "dropper" {
		t.Errorf("Happy Path: invalid cookies set")
	}

	reqBad, _ := http.NewRequest("POST", "/api/register", bytes.NewBufferString("{bad json"))
	rrBad := httptest.NewRecorder()
	router.ServeHTTP(rrBad, reqBad)
	if status := rrBad.Code; status != http.StatusBadRequest {
		t.Errorf("Error Path (Bad JSON): expected 400, got %v", status)
	}

	badPayload := File{Name: "", Size: 0, Type: ""}
	badPayloadBody, _ := json.Marshal(badPayload)
	reqInvalid, _ := http.NewRequest("POST", "/api/register", bytes.NewBuffer(badPayloadBody))
	rrInvalid := httptest.NewRecorder()
	router.ServeHTTP(rrInvalid, reqInvalid)
	if status := rrInvalid.Code; status != http.StatusBadRequest {
		t.Errorf("Error Path (Invalid Payload): expected 400, got %v", status)
	}
}

func TestServePeek(t *testing.T) {
	apiHandler, router := initTestAPI(t)

	var dropID string
	err := apiHandler.db.QueryRow(context.Background(), "INSERT INTO drops(code, file_name, file_size, file_type) VALUES('PEEK12', 'peek.txt', 123, 'text/plain') RETURNING id").Scan(&dropID)
	if err != nil {
		t.Fatalf("Failed to insert drop: %v", err)
	}

	req, _ := http.NewRequest("GET", "/api/peek/PEEK12", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}
	if !strings.Contains(rr.Body.String(), "peek.txt") {
		t.Errorf("Happy Path: expected file info in body, got %s", rr.Body.String())
	}

	reqRegex, _ := http.NewRequest("GET", "/api/peek/BAD", nil)
	rrRegex := httptest.NewRecorder()
	router.ServeHTTP(rrRegex, reqRegex)
	if status := rrRegex.Code; status != http.StatusBadRequest {
		t.Errorf("Error Path (Regex): expected 400, got %v", status)
	}

	reqNotFound, _ := http.NewRequest("GET", "/api/peek/NONONO", nil)
	rrNotFound := httptest.NewRecorder()
	router.ServeHTTP(rrNotFound, reqNotFound)
	if status := rrNotFound.Code; status != http.StatusNotFound {
		t.Errorf("Error Path (NotFound): expected 404, got %v", status)
	}
}

func TestServeClaim(t *testing.T) {
	apiHandler, router := initTestAPI(t)

	var dropID string
	err := apiHandler.db.QueryRow(context.Background(), "INSERT INTO drops(code, file_name, file_size, file_type) VALUES('CLAIM1', 'claim.txt', 123, 'text/plain') RETURNING id").Scan(&dropID)
	if err != nil {
		t.Fatalf("Failed to insert drop: %v", err)
	}

	req, _ := http.NewRequest("POST", "/api/claim/CLAIM1", nil)
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}

	cookies := rr.Result().Cookies()
	var role string
	for _, c := range cookies {
		if c.Name == "drop_role" {
			role = c.Value
		}
	}
	if role != "receiver" {
		t.Errorf("Happy Path: expected receiver role cookie")
	}

	reqClaimed, _ := http.NewRequest("POST", "/api/claim/CLAIM1", nil)
	rrClaimed := httptest.NewRecorder()
	router.ServeHTTP(rrClaimed, reqClaimed)
	if status := rrClaimed.Code; status != http.StatusNotFound {
		t.Errorf("Error Path (Already Claimed): expected 404, got %v", status)
	}
}

func TestServeCleanup(t *testing.T) {
	apiHandler, router := initTestAPI(t)

	var dropID string
	err := apiHandler.db.QueryRow(context.Background(), "INSERT INTO drops(code, file_name, file_size, file_type) VALUES('CLEAN1', 'clean.txt', 123, 'text/plain') RETURNING id").Scan(&dropID)
	if err != nil {
		t.Fatalf("Failed to insert drop: %v", err)
	}

	req, _ := http.NewRequest("POST", "/api/cleanup", nil)
	req.AddCookie(&http.Cookie{Name: "drop_id", Value: dropID})
	req.AddCookie(&http.Cookie{Name: "drop_role", Value: "dropper"})
	rr := httptest.NewRecorder()
	router.ServeHTTP(rr, req)

	if status := rr.Code; status != http.StatusOK {
		t.Errorf("Happy Path: expected 200, got %v", status)
	}

	cookies := rr.Result().Cookies()
	if len(cookies) < 2 {
		t.Errorf("Happy Path: expected deleted cookies")
	}
	for _, c := range cookies {
		if c.MaxAge != -1 || c.Value != "" {
			t.Errorf("Happy Path: cookie not properly deleted")
		}
	}

	var isComplete bool
	err = apiHandler.db.QueryRow(context.Background(), "SELECT is_complete FROM drops WHERE id = $1", dropID).Scan(&isComplete)
	if err != nil || !isComplete {
		t.Errorf("Happy Path: expected drop to be completed in db")
	}
}
