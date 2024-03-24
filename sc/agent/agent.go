package agent

import (
	"fmt"
	"net/http"
	"sync"
	ws "github.com/gorilla/websocket"
)

type drop struct {
	Id        int        // drop identifier
	Dropper   *ws.Conn   // the WebSocket connection for the dropper
	Recipient *ws.Conn   // the WebSocket connection for the recipient
	mux       sync.Mutex
}

type Agent struct {
	drops map[int]*drop // maps drop identifiers to a drop
	mux   sync.Mutex
}

var upgrader = ws.Upgrader{
	ReadBufferSize: 0,
	WriteBufferSize: 0,
	CheckOrigin: func(r *http.Request) bool {
		// accept all origins
		// replace with domain when its prepared
		return true
	},
}

func (a *Agent) Init() {
	a.drops = make(map[int]*drop)
	fmt.Printf("Started agent.\n")
}

func (a *Agent) ServePing(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Pong"))
}
