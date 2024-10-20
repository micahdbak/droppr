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

// get the session token and drop ID from cookies
func getSession(r *http.Request) (string, string) {
	// get session token from cookies
	token, err := r.Cookie("session_token")
	if err != nil {
		return "", ""
	}

	// get drop ID from cookies
	id, err := r.Cookie("drop_id")
	if err != nil {
		return "", ""
	}

	// return the existing session
	return token.Value, id.Value
}

// ----------------------------------------------------------------

// authorizes an incoming request (authorized when bool == true) returning the session token, drop ID, and role
func authorizeSignalChannelRequest(r *http.Request) (string, string, string, error) {
	token, id := getSession(r)
	if len(token) == 0 || len(id) == 0 {
		err := fmt.Errorf("invalid session")
		return "", "", "", err
	}

	role, err := selectDropRoleWithTokenAndId(token, id)
	if err != nil {
		return "", "", "", err
	}

	// authorized session; return values
	return token, id, role, nil
}

// ----------------------------------------------------------------

// Upgrades an authorized request to a signal channel (WebSocket connection)
func serveSignalChannel(w http.ResponseWriter, r *http.Request) {
	setCORS(&w)

	_, id, role, err := authorizeSignalChannelRequest(r)
	if err != nil {
		logError(r, "%v", err)
		http.Error(w,
			http.StatusText(http.StatusUnauthorized),
			http.StatusUnauthorized)
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
			err = sc.Receiver.WriteMessage(t, msg)
		} else if role == "receiver" && sc.Dropper != nil {
			err = sc.Dropper.WriteMessage(t, msg)
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
