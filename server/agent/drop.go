// Copyright (C) 2024 droppr. All rights reserved.
//

package agent

import (
	"sync"

	ws "github.com/gorilla/websocket"
)

type drop struct {
	Uuid      string   // drop identifier
	Dropper   *ws.Conn // the WebSocket connection for the dropper
	Recipient *ws.Conn // the WebSocket connection for the recipient
	mux       sync.Mutex
}

func (d *drop) setDropper(sock *ws.Conn) {
	d.mux.Lock()
	defer d.mux.Unlock()

	d.Dropper = sock
}

func (d *drop) setRecipient(sock *ws.Conn) {
	d.mux.Lock()
	defer d.mux.Unlock()

	d.Recipient = sock
}
