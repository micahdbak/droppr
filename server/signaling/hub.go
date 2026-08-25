package signaling

import (
	"fmt"
	"log/slog"
	"net/http"
	"sync"

	ws "github.com/gorilla/websocket"
)

var upgrader = ws.Upgrader{
	ReadBufferSize:  0,
	WriteBufferSize: 0,
	CheckOrigin: func(r *http.Request) bool {
		return true // dev mode
	},
}

// Hub manages active WebRTC signaling channels between peers.
type Hub struct {
	channels    map[string]*channel
	channelsMux sync.Mutex
}

// NewHub creates a new signaling Hub.
func NewHub() *Hub {
	return &Hub{
		channels: make(map[string]*channel),
	}
}

// ServeWebSocket upgrades an HTTP connection to a WebSocket and handles signaling for a drop session.
func (h *Hub) ServeWebSocket(w http.ResponseWriter, r *http.Request, dropID, role string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade websocket connection", "error", err)
		return
	}
	defer conn.Close()

	// get or create signal channel for this dropID
	h.channelsMux.Lock()
	sc, exists := h.channels[dropID]
	if !exists {
		sc = &channel{
			id:  dropID,
			hub: h,
		}
		h.channels[dropID] = sc
	}
	h.channelsMux.Unlock()

	// connect peer to channel
	if !sc.connect(role, conn) {
		conn.WriteMessage(ws.TextMessage, []byte(`{"status":"busy"}`))
		slog.Error("peer role already connected", "role", role, "drop_id", dropID)
		return
	}
	defer sc.disconnect(role)

	for {
		t, msg, err := conn.ReadMessage()
		if err != nil {
			break
		}

		sc.mux.Lock()
		var sendErr error
		if role == "dropper" && sc.receiver != nil {
			if sendErr = sc.receiver.WriteMessage(t, msg); sendErr != nil {
				slog.Warn("failed to write message to receiver", "error", sendErr)
			}
		} else if role == "receiver" && sc.dropper != nil {
			if sendErr = sc.dropper.WriteMessage(t, msg); sendErr != nil {
				slog.Warn("failed to write message to dropper", "error", sendErr)
			}
		} else {
			sendErr = fmt.Errorf("peer not connected")
		}

		if sendErr != nil {
			failedMsg := fmt.Sprintf(`{"status":"failed","data":%s}`, msg)
			conn.WriteMessage(ws.TextMessage, []byte(failedMsg))
		}
		sc.mux.Unlock()
	}
}
