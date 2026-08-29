// main.go

package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"server/signaling"

	"github.com/jackc/pgx/v5/pgxpool"
)

// shared database connection
var db *pgxpool.Pool

func setupRouter(hub *signaling.Hub) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/check", serveCheck)
	mux.HandleFunc("POST /api/claim/{code}", serveClaim)
	mux.HandleFunc("POST /api/cleanup", serveCleanup)
	mux.HandleFunc("GET /api/peek/{code}", servePeek)
	mux.HandleFunc("POST /api/register", serveRegister)
	mux.HandleFunc("GET /api/status", serveStatus)
	if hub != nil {
		mux.HandleFunc("GET /sc", func(w http.ResponseWriter, r *http.Request) {
			setCORS(w)
			id, role := getSessionFromCookies(r)
			if len(id) == 0 || len(role) == 0 {
				slog.Warn("invalid session in signal channel request")
				writeHTTPError(w, http.StatusUnauthorized)
				return
			}
			hub.ServeWebSocket(w, r, id, role)
		})
	}
	return mux
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	hub := signaling.NewHub()

	slog.Info("~~ droppr server ~~")

	// connect to database
	var err error
	db, err = pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}
	defer db.Close()

	// do a test query to make sure the db connection is live and good
	row := db.QueryRow(ctx, "SELECT 'Hello from postgres!'::text AS text")
	var dbText string
	err = row.Scan(&dbText)
	if err != nil {
		panic(fmt.Sprintf("%v", err))
	}
	slog.Info("database connection established", "db_response", dbText)

	mux := setupRouter(hub)

	srv := &http.Server{
		Addr:    ":5050",
		Handler: mux,
	}

	go func() {
		slog.Info("server listening", "addr", srv.Addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("server failed to start/listen", "error", err)
			os.Exit(1)
		}
	}()

	<-ctx.Done()
	slog.Info("shutting down server gracefully...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	} else {
		slog.Info("server stopped gracefully")
	}
}
