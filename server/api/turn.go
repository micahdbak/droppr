package api

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"strconv"
	"time"
)

const turnCredentialTTL = 4 * time.Hour

// TurnConfig configures TURN credential issuance.
type TurnConfig struct {
	Secret string
	URLs   []string
}

// Enabled reports whether TURN credentials should be issued.
func (t TurnConfig) Enabled() bool {
	return t.Secret != "" && len(t.URLs) > 0
}

// TurnCredentials are ephemeral TURN credentials issued to a dropper.
type TurnCredentials struct {
	URLs       []string `json:"urls"`
	Username   string   `json:"username"`
	Credential string   `json:"credential"`
}

func turnCredentials(config TurnConfig) TurnCredentials {
	username := strconv.FormatInt(time.Now().Add(turnCredentialTTL).Unix(), 10)

	mac := hmac.New(sha1.New, []byte(config.Secret))
	mac.Write([]byte(username))

	return TurnCredentials{
		URLs:       config.URLs,
		Username:   username,
		Credential: base64.StdEncoding.EncodeToString(mac.Sum(nil)),
	}
}
