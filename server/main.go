package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"server/api"
	"server/signaling"

	"github.com/jackc/pgx/v5/pgxpool"
)

func setupRouter(apiHandler *api.API, sig *signaling.Server) *http.ServeMux {
	mux := http.NewServeMux()

	if apiHandler != nil {
		apiHandler.RegisterRoutes(mux)
	}

	if sig != nil {
		mux.HandleFunc("GET /sc", sig.Handler(api.GetSession))
	}

	return mux
}

// when env vars are unset or half-configured, TURN is disabled.
func turnConfigFromEnv() api.TurnConfig {
	secret := strings.TrimSpace(os.Getenv("TURN_SECRET"))
	urlsStr := strings.TrimSpace(os.Getenv("TURN_URLS"))

	if (secret == "") != (urlsStr == "") {
		slog.Warn("TURN_SECRET and TURN_URLS must both be set to enable TURN; disabling TURN")
		return api.TurnConfig{}
	}

	var urls []string
	for _, url := range strings.Split(urlsStr, ",") {
		if url = strings.TrimSpace(url); url != "" {
			urls = append(urls, url)
		}
	}

	return api.TurnConfig{Secret: secret, URLs: urls}
}

func main() {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	slog.Info("~~ droppr server ~~")

	db, err := pgxpool.New(ctx, os.Getenv("DATABASE_URL"))
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

	turnConfig := turnConfigFromEnv()
	if turnConfig.Enabled() {
		slog.Info("TURN relay enabled;", "urls", turnConfig.URLs)
	}
	apiHandler := api.New(db, turnConfig)
	sig := signaling.NewServer()
	mux := setupRouter(apiHandler, sig)

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
