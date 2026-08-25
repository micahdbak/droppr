package main

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

/*
* Verifies that message relaying between two peers in the same session actually works
*/
func TestSignalChannelRelay(t *testing.T) {
	// Initialize global state for the test
	signalChannels = make(map[string]*signalChannel)

	server := httptest.NewServer(http.HandlerFunc(serveSignalChannel))
	defer server.Close()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Helper to connect a peer with mock cookies
	connectPeer := func(role, dropId string) *websocket.Conn {
		req, _ := http.NewRequest("GET", wsURL, nil)
		req.AddCookie(&http.Cookie{Name: "drop_id", Value: dropId})
		req.AddCookie(&http.Cookie{Name: "drop_role", Value: role})
		ws, _, err := websocket.DefaultDialer.Dial(wsURL, req.Header)
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

/*
* Verifies that a signal channel is cleaned up after both peers disconnect
*/
func TestSignalChannelCleanup(t *testing.T) {
	signalChannels = make(map[string]*signalChannel)
	server := httptest.NewServer(http.HandlerFunc(serveSignalChannel))
	defer server.Close()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")

	// Connect both peers
	req := http.Header{}
	req.Add("Cookie", "drop_id=cleanup_test; drop_role=dropper")
	dropper, _, _ := websocket.DefaultDialer.Dial(wsURL, req)

	req2 := http.Header{}
	req2.Add("Cookie", "drop_id=cleanup_test; drop_role=receiver")
	receiver, _, _ := websocket.DefaultDialer.Dial(wsURL, req2)

	// Verify room was created
	signalChannelsMux.Lock()
	if _, exists := signalChannels["cleanup_test"]; !exists {
		t.Errorf("Expected room to exist in map")
	}
	signalChannelsMux.Unlock()

	// Disconnect both
	if dropper != nil {
		dropper.Close()
	}
	if receiver != nil {
		receiver.Close()
	}

	// Yield briefly to allow server-side defers to execute
	time.Sleep(50 * time.Millisecond)

	// Verify room was garbage collected
	signalChannelsMux.Lock()
	if _, exists := signalChannels["cleanup_test"]; exists {
		t.Errorf("Expected room to be deleted from map after disconnects")
	}
	signalChannelsMux.Unlock()
}