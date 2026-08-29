package api

import (
	"net/http"
)

func (a *API) serveStatus(w http.ResponseWriter, r *http.Request) {
	setCORS(w)

	numDrops, err := a.selectNumDropsComplete(r.Context())
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]int64{"drops": 0})
		return
	}

	writeJSON(w, http.StatusOK, map[string]int64{"drops": numDrops})
}
