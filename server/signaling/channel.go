package signaling

import (
	"sync"

	"github.com/coder/websocket"
)

type channel struct {
	id       string
	dropper  *websocket.Conn
	receiver *websocket.Conn
	server   *Server
	mux      sync.Mutex
}

func (c *channel) connect(role string, conn *websocket.Conn) bool {
	c.mux.Lock()
	defer c.mux.Unlock()

	if role == "dropper" {
		if c.dropper != nil {
			return false
		}
		c.dropper = conn
	} else {
		if c.receiver != nil {
			return false
		}
		c.receiver = conn
	}
	return true
}

func (c *channel) disconnect(role string) {
	c.mux.Lock()
	defer c.mux.Unlock()

	if role == "dropper" {
		c.dropper = nil
	} else {
		c.receiver = nil
	}

	// if both peers are disconnected, safely remove channel from server map
	if c.dropper == nil && c.receiver == nil {
		c.server.channelsMux.Lock()
		// verify the channel in the map is still this exact instance before deleting
		if c.server.channels[c.id] == c {
			delete(c.server.channels, c.id)
		}
		c.server.channelsMux.Unlock()
	}
}
