package api

import (
	"net/http"

	"github.com/jackc/pgx/v5/pgxpool"
)

type API struct {
	db   *pgxpool.Pool
	turn TurnConfig
}

func New(db *pgxpool.Pool, turn TurnConfig) *API {
	return &API{db: db, turn: turn}
}

func (a *API) RegisterRoutes(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/check", a.serveCheck)
	mux.HandleFunc("POST /api/claim/{code}", a.serveClaim)
	mux.HandleFunc("POST /api/cleanup", a.serveCleanup)
	mux.HandleFunc("GET /api/peek/{code}", a.servePeek)
	mux.HandleFunc("POST /api/register", a.serveRegister)
	mux.HandleFunc("GET /api/status", a.serveStatus)
}

func GetSession(r *http.Request) (string, string) {
	return getSessionFromCookies(r)
}
