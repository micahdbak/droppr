package signaling

import (
	"sync"

	ws "github.com/gorilla/websocket"
)

// channel represents an active signaling channel between two peers for a specific drop.
type channel struct {
	id       string
	dropper  *ws.Conn
	receiver *ws.Conn
	hub      *Hub
	mux      sync.Mutex
}

func (c *channel) connect(role string, conn *ws.Conn) bool {
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

	// if both peers are disconnected, safely remove channel from hub map
	if c.dropper == nil && c.receiver == nil {
		c.hub.channelsMux.Lock()
		// verify the channel in the map is still this exact instance before deleting
		if c.hub.channels[c.id] == c {
			delete(c.hub.channels, c.id)
		}
		c.hub.channelsMux.Unlock()
	}
}
