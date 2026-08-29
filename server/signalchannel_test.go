package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"server/signaling"

	"github.com/gorilla/websocket"
)

// ----------------------------------------------------------------

// TestSignalChannelRelay verifies that message relaying between two peers in the same session works.
func TestSignalChannelRelay(t *testing.T) {
	hub := signaling.NewHub()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, role := getSessionFromCookies(r)
		hub.ServeWebSocket(w, r, id, role)
	}))
	defer server.Close()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Helper to connect a peer with mock cookies
	connectPeer := func(role, dropId string) *websocket.Conn {
		header := http.Header{}
		header.Add("Cookie", "drop_id="+dropId+"; drop_role="+role)
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, header)
		if err != nil {
			t.Fatalf("Failed to dial %s: %v", role, err)
		}
		return ws
	}

	dropper := connectPeer("dropper", "test_drop_123")
	defer dropper.Close()

	receiver := connectPeer("receiver", "test_drop_123")
	defer receiver.Close()

	// Test Relay: Dropper -> Receiver
	testMsg := []byte(`{"type": "offer", "sdp": "fake"}`)
	dropper.WriteMessage(websocket.TextMessage, testMsg)

	receiver.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, msg, err := receiver.ReadMessage()
	if err != nil || string(msg) != string(testMsg) {
		t.Fatalf("Expected %s, got %s (err: %v)", testMsg, msg, err)
	}
}

// TestSignalChannelCleanup verifies that a signal channel is cleaned up after both peers disconnect.
func TestSignalChannelCleanup(t *testing.T) {
	hub := signaling.NewHub()
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id, role := getSessionFromCookies(r)
		hub.ServeWebSocket(w, r, id, role)
	}))
	defer server.Close()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect both peers
	headerDropper := http.Header{}
	headerDropper.Add("Cookie", "drop_id=cleanup_test; drop_role=dropper")
	dropper, _, err := websocket.DefaultDialer.Dial(wsURL, headerDropper)
	if err != nil {
		t.Fatalf("Failed to connect dropper: %v", err)
	}

	headerReceiver := http.Header{}
	headerReceiver.Add("Cookie", "drop_id=cleanup_test; drop_role=receiver")
	receiver, _, err := websocket.DefaultDialer.Dial(wsURL, headerReceiver)
	if err != nil {
		t.Fatalf("Failed to connect receiver: %v", err)
	}

	// Verify channel was created
	if !hub.HasChannel("cleanup_test") {
		t.Errorf("Expected channel to exist in hub")
	}

	// Disconnect both
	dropper.Close()
	receiver.Close()

	// Yield briefly to allow server-side defers to execute
	time.Sleep(50 * time.Millisecond)

	// Verify channel was garbage collected
	if hub.HasChannel("cleanup_test") {
		t.Errorf("Expected channel to be deleted from hub after disconnects")
	}
}
