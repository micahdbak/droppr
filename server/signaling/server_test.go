package signaling

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func connectPeer(t *testing.T, wsURL, role, dropID string) *websocket.Conn {
	t.Helper()
	header := http.Header{}
	header.Add("Cookie", "drop_id="+dropID+"; drop_role="+role)
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, header)
	if err != nil {
		t.Fatalf("Failed to dial %s: %v", role, err)
	}
	return conn
}

func newTestServer(sig *Server) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		idCookie, err := r.Cookie("drop_id")
		if err != nil {
			http.Error(w, "missing drop_id", http.StatusUnauthorized)
			return
		}
		roleCookie, err := r.Cookie("drop_role")
		if err != nil {
			http.Error(w, "missing drop_role", http.StatusUnauthorized)
			return
		}
		sig.ServeWebSocket(w, r, idCookie.Value, roleCookie.Value)
	}))
}

func TestServerRelay(t *testing.T) {
	sig := NewServer()
	ts := newTestServer(sig)
	defer ts.Close()
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	dropper := connectPeer(t, wsURL, "dropper", "relay_test")
	defer dropper.Close()

	receiver := connectPeer(t, wsURL, "receiver", "relay_test")
	defer receiver.Close()

	testMsg := []byte(`{"type":"offer","sdp":"fake"}`)
	dropper.WriteMessage(websocket.TextMessage, testMsg)

	receiver.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, msg, err := receiver.ReadMessage()
	if err != nil || string(msg) != string(testMsg) {
		t.Fatalf("Expected %s, got %s (err: %v)", testMsg, msg, err)
	}

	replyMsg := []byte(`{"type":"answer","sdp":"fake_answer"}`)
	receiver.WriteMessage(websocket.TextMessage, replyMsg)

	dropper.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, msg, err = dropper.ReadMessage()
	if err != nil || string(msg) != string(replyMsg) {
		t.Fatalf("Expected %s, got %s (err: %v)", replyMsg, msg, err)
	}
}

func TestServerChannelCleanup(t *testing.T) {
	sig := NewServer()
	ts := newTestServer(sig)
	defer ts.Close()
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	dropper := connectPeer(t, wsURL, "dropper", "cleanup_test")
	receiver := connectPeer(t, wsURL, "receiver", "cleanup_test")

	if !sig.HasChannel("cleanup_test") {
		t.Fatal("Expected channel to exist in server after both peers connected")
	}
	if sig.ActiveChannels() != 1 {
		t.Fatalf("Expected 1 active channel, got %d", sig.ActiveChannels())
	}

	dropper.Close()
	receiver.Close()

	time.Sleep(50 * time.Millisecond)

	if sig.HasChannel("cleanup_test") {
		t.Error("Expected channel to be removed from server after both peers disconnected")
	}
	if sig.ActiveChannels() != 0 {
		t.Errorf("Expected 0 active channels, got %d", sig.ActiveChannels())
	}
}

func TestServerDuplicateRole(t *testing.T) {
	sig := NewServer()
	ts := newTestServer(sig)
	defer ts.Close()
	wsURL := "ws" + strings.TrimPrefix(ts.URL, "http")

	dropper1 := connectPeer(t, wsURL, "dropper", "dup_test")
	defer dropper1.Close()

	dropper2 := connectPeer(t, wsURL, "dropper", "dup_test")
	defer dropper2.Close()

	dropper2.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, msg, err := dropper2.ReadMessage()
	if err != nil {
		t.Fatalf("Expected busy message, got error: %v", err)
	}
	if !strings.Contains(string(msg), "busy") {
		t.Fatalf("Expected busy status, got: %s", msg)
	}
}
