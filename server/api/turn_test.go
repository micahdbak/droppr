package api

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"slices"
	"strconv"
	"testing"
	"time"
)

func TestTurnCredentials(t *testing.T) {
	config := TurnConfig{
		Secret: "test-secret",
		URLs:   []string{"turn:localhost:3478?transport=udp"},
	}

	credentials := turnCredentials(config)

	if !slices.Equal(credentials.URLs, config.URLs) {
		t.Errorf("unexpected urls: got %v, want %v", credentials.URLs, config.URLs)
	}

	expiry, err := strconv.ParseInt(credentials.Username, 10, 64)
	if err != nil {
		t.Fatalf("username is not a unix timestamp: %v", err)
	}
	if expiry <= time.Now().Unix() {
		t.Errorf("expected future expiry, got %d", expiry)
	}

	mac := hmac.New(sha1.New, []byte(config.Secret))
	mac.Write([]byte(credentials.Username))
	expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
	if credentials.Credential != expected {
		t.Errorf("unexpected credential: got %q, want %q", credentials.Credential, expected)
	}
}

func TestTurnConfigEnabled(t *testing.T) {
	tests := []struct {
		config TurnConfig
		want   bool
	}{
		{TurnConfig{}, false},
		{TurnConfig{Secret: "test-secret"}, false},
		{TurnConfig{URLs: []string{"turn:localhost:3478"}}, false},
		{TurnConfig{Secret: "test-secret", URLs: []string{"turn:localhost:3478"}}, true},
	}

	for _, test := range tests {
		if got := test.config.Enabled(); got != test.want {
			t.Errorf("enabled() for %+v: got %v, want %v", test.config, got, test.want)
		}
	}
}
