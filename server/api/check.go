package api

import (
	"net/http"
)

func (a *API) serveCheck(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	id, role := getSessionFromCookies(r)
	if len(id) > 0 || len(role) > 0 {
		writeHTTPError(w, http.StatusConflict)
		return
	}
}
