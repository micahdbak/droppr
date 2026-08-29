package api

import (
	"context"
	"log/slog"
	"net/http"
	"time"
)

func (a *API) completeDrop(ctx context.Context, dropId string) error {
	_, err := a.db.Exec(ctx, "UPDATE drops SET is_complete = 't' WHERE id = $1", dropId)
	return err
}

func (a *API) serveCleanup(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "drop_role",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	id, _ := getSessionFromCookies(r)
	if len(id) > 0 {
		if err := a.completeDrop(r.Context(), id); err != nil {
			// don't report this error to the requester; as far as they are concerned, the cookies were deleted properly
			slog.Warn("failed to mark drop complete during cleanup", "drop_id", id, "error", err)
		} else {
			slog.Info("completed drop", "drop_id", id)
		}
	}
}
