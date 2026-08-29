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

type SessionFunc func(r *http.Request) (id string, role string)

type Server struct {
	channels    map[string]*channel
	channelsMux sync.Mutex
}

func NewServer() *Server {
	return &Server{
		channels: make(map[string]*channel),
	}
}

func (s *Server) ActiveChannels() int {
	s.channelsMux.Lock()
	defer s.channelsMux.Unlock()
	return len(s.channels)
}

func (s *Server) HasChannel(dropID string) bool {
	s.channelsMux.Lock()
	defer s.channelsMux.Unlock()
	_, exists := s.channels[dropID]
	return exists
}

func (s *Server) Handler(getSession SessionFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")

		id, role := getSession(r)
		if id == "" || role == "" {
			slog.Warn("invalid session in signal channel request")
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
			return
		}

		s.ServeWebSocket(w, r, id, role)
	}
}

func (s *Server) ServeWebSocket(w http.ResponseWriter, r *http.Request, dropID, role string) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("failed to upgrade websocket connection", "error", err)
		return
	}
	defer conn.Close()

	s.channelsMux.Lock()
	sc, exists := s.channels[dropID]
	if !exists {
		sc = &channel{
			id:     dropID,
			server: s,
		}
		s.channels[dropID] = sc
	}
	s.channelsMux.Unlock()

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
