// signalchannel.go

package main

import (
	"fmt"
	"net/http"
	"sync"

	ws "github.com/gorilla/websocket"
)

// ----------------------------------------------------------------

var upgrader = ws.Upgrader{
	ReadBufferSize:  0,
	WriteBufferSize: 0,
	CheckOrigin: func(r *http.Request) bool {
		// e.g., return r.URL.Host == "droppr.net"
		return true // just in dev
	},
}

// ----------------------------------------------------------------

// a signal channel between two peers
type signalChannel struct {
	Id       string
	Dropper  *ws.Conn
	Receiver *ws.Conn
	Mux      sync.Mutex
}

// ----------------------------------------------------------------

func (sc *signalChannel) Connect(role string, conn *ws.Conn) bool {
	sc.Mux.Lock()
	defer sc.Mux.Unlock()

	if role == "dropper" {
		if sc.Dropper != nil {
			return false
		}

		sc.Dropper = conn
	} else {
		if sc.Receiver != nil {
			return false
		}

		sc.Receiver = conn
	}

	return true
}

// ----------------------------------------------------------------

func (sc *signalChannel) Disconnect(role string) {
	sc.Mux.Lock()
	defer sc.Mux.Unlock()

	if role == "dropper" {
		sc.Dropper = nil

		if sc.Receiver == nil {
			// delete the signal channel; it will be recreated upon reconnection
			delete(signalChannels, sc.Id)
		}
	} else {
		sc.Receiver = nil

		if sc.Dropper == nil {
			// delete the signal channel; it will be recreated upon reconnection
			delete(signalChannels, sc.Id)
		}
	}
}

var (
	signalChannels    map[string]*signalChannel
	signalChannelsMux sync.Mutex
)

// ----------------------------------------------------------------

// Upgrades an authorized request to a signal channel (WebSocket connection)
func serveSignalChannel(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	// get drop ID and role from cookies
	id, role := getSessionFromCookies(r)
	if len(id) == 0 || len(role) == 0 {
		logWarning(r, "%v", fmt.Errorf("invalid session"))
		writeHTTPError(&w, http.StatusUnauthorized)
		return
	}

	// upgrade request to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		logError(r, "%v", err)
		return
	}
	defer conn.Close() // good to be safe

	// get signal channel
	signalChannelsMux.Lock()
	sc, exists := signalChannels[id]
	if !exists {
		sc = new(signalChannel)
		sc.Id = id
		signalChannels[id] = sc
	}
	signalChannelsMux.Unlock()

	// store WebSocket connection in signal channel
	connected := sc.Connect(role, conn)
	if !connected {
		conn.WriteMessage(ws.TextMessage, []byte("{\"status\":\"busy\"}"))
		logError(r, "%s already connected", role)
		return
	}
	defer sc.Disconnect(role)

	for {
		t, msg, err := conn.ReadMessage()
		if err != nil {
			break // close connection
		}

		sc.Mux.Lock()

		// attempt to send message to peer
		if role == "dropper" && sc.Receiver != nil {
			if err = sc.Receiver.WriteMessage(t, msg); err != nil {
				logWarning(r, "%v", err)
			}
		} else if role == "receiver" && sc.Dropper != nil {
			if err = sc.Dropper.WriteMessage(t, msg); err != nil {
				logWarning(r, "%v", err)
			}
		} else {
			// peer isn't connected, fail the message
			err = fmt.Errorf("peer not connected")
		}

		// bounce message back as failed if an error occurred
		if err != nil {
			failedMsg := fmt.Sprintf("{\"status\":\"failed\",\"data\":%s}", msg)
			conn.WriteMessage(ws.TextMessage, []byte(failedMsg))
		}

		sc.Mux.Unlock()
	}
}
