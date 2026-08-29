package signaling

import (
	"testing"

	ws "github.com/gorilla/websocket"
)

func TestChannelConnect(t *testing.T) {
	ch := &channel{}
	dummyConn1 := &ws.Conn{}
	dummyConn2 := &ws.Conn{}

	// initial connect returns true
	if !ch.connect("dropper", dummyConn1) {
		t.Errorf("expected initial dropper connect to succeed")
	}
	if !ch.connect("receiver", dummyConn1) {
		t.Errorf("expected initial receiver connect to succeed")
	}

	// duplicate connect for active role returns false
	if ch.connect("dropper", dummyConn2) {
		t.Errorf("expected duplicate dropper connect to fail")
	}
	if ch.connect("receiver", dummyConn2) {
		t.Errorf("expected duplicate receiver connect to fail")
	}
}

func TestChannelDisconnectAndCleanup(t *testing.T) {
	sig := NewServer()
	ch := &channel{id: "room-1", server: sig}

	sig.channels["room-1"] = ch
	dummyConn := &ws.Conn{}

	ch.connect("dropper", dummyConn)
	ch.connect("receiver", dummyConn)

	// disconnecting only one peer retains channel in server
	ch.disconnect("dropper")
	if !sig.HasChannel("room-1") {
		t.Errorf("expected channel to remain when receiver is still connected")
	}

	// disconnecting both peers purges channel from server
	ch.disconnect("receiver")
	if sig.HasChannel("room-1") {
		t.Errorf("expected channel to be deleted from server after both disconnect")
	}
}
