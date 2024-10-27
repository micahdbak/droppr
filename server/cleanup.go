// cleanup.go

package main

import (
	"context"
	"net/http"
	"time"
)

// ----------------------------------------------------------------

func completeDrop(dropId string) error {
	_, err := db.Exec(context.Background(), "UPDATE drops SET is_complete = 't' WHERE id = $1", dropId)
	if err != nil {
		return err
	}

	return nil
}

// ----------------------------------------------------------------

// Clean up cookies
func serveCleanup(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	if r.Method != http.MethodPost {
		writeHTTPError(&w, http.StatusBadRequest)
		return
	}

	// delete the drop_id cookie
	http.SetCookie(w, &http.Cookie{
		Name:     "drop_id",
		Value:    "",
		Path:     "/",
		Expires:  time.Unix(0, 0),
		MaxAge:   -1,
		HttpOnly: true,
	})

	// delete the drop_role cookie
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
		if err := completeDrop(id); err != nil {
			logWarning(r, "%v", err)
			// don't report this error to the requester; as far as they are concerned, the cookies were deleted properly
		} else {
			logInfo(r, "completed drop %s", id)
		}
	}
}
