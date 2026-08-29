package signaling

import (
	"testing"

	"github.com/coder/websocket"
)

func TestChannelConnect(t *testing.T) {
	ch := &channel{}
	dummyConn1 := &websocket.Conn{}
	dummyConn2 := &websocket.Conn{}

	if !ch.connect("dropper", dummyConn1) {
		t.Errorf("expected initial dropper connect to succeed")
	}
	if !ch.connect("receiver", dummyConn1) {
		t.Errorf("expected initial receiver connect to succeed")
	}

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
	dummyConn := &websocket.Conn{}

	ch.connect("dropper", dummyConn)
	ch.connect("receiver", dummyConn)

	ch.disconnect("dropper")
	if !sig.HasChannel("room-1") {
		t.Errorf("expected channel to remain when receiver is still connected")
	}

	ch.disconnect("receiver")
	if sig.HasChannel("room-1") {
		t.Errorf("expected channel to be deleted from server after both disconnect")
	}
}
