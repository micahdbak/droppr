// Copyright (C) 2024 droppr. All rights reserved.
//

package agent

import (
	"fmt"
	"net/http"
	"sync"

	"github.com/google/uuid"
	ws "github.com/gorilla/websocket"
)

type Agent struct {
	drops map[string]*drop // maps drop identifiers to a drop
	mux   sync.Mutex
}

var upgrader = ws.Upgrader{
	ReadBufferSize:  0,
	WriteBufferSize: 0,
	CheckOrigin: func(r *http.Request) bool {
		// accept all origins
		// replace with domain when its prepared
		return true
	},
}

// private functions

// register a drop (make open for recipients)
func (a *Agent) register() *drop {
	a.mux.Lock()
	defer a.mux.Unlock()

	// make a new drop
	d := new(drop)

	// generate a drop identifier
	id := uuid.NewString()

	d.Uuid = id

	// register this drop
	a.drops[d.Uuid] = d

	return d
}

// unregister a drop (make not available for recipients)
func (a *Agent) unregister(id string) {
	a.mux.Lock()
	defer a.mux.Unlock()

	d := a.drops[id]

	// unregister if the drop exists
	if d != nil {
		d.mux.Lock()
		defer d.mux.Unlock()

		// close the dropper connection if it is open
		if d.Dropper != nil {
			d.Dropper.Close()
			// any goroutines using this connection will close
		}

		// close the recipient connection if it is open
		if d.Recipient != nil {
			d.Recipient.Close()
			// any goroutines using this connection will close
		}

		// unregister this drop
		a.drops[id] = nil
	}
}

// get a drop given a drop identifier
func (a *Agent) getDrop(id string) *drop {
	a.mux.Lock()
	defer a.mux.Unlock()

	return a.drops[id]
}

// public functions

func (a *Agent) Init() {
	a.drops = make(map[string]*drop)
	fmt.Printf("Started the signal channel agent.\n")
	fmt.Printf("Listening for droppers and recipients...\n")
}

// /drop/:uuid
func (a *Agent) ServeDropper(w http.ResponseWriter, r *http.Request) {
	// extract the drop identifier from the request URL (if given)
	id := r.URL.Path[6:]

	// upgrade request to a WebSocket connection
	sock, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Couldn't upgrade: %v\n", err)
		return
	}
	defer sock.Close() // good to be safe

	var d *drop

	// if a drop identifier was provided
	if len(id) > 0 {
		// get the drop for this identifier
		d = a.getDrop(id)

		// if the drop doesn't exist
		if d == nil {
			// write a 'error' status to the interested dropper
			sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"error\"}"))

			// close the request
			return
		}

		// check if a dropper is already connected
		d.mux.Lock()
		if d.Dropper != nil {
			d.mux.Unlock()

			// write a 'busy' status to the interested dropper
			sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"busy\"}"))

			return
		}

		// no dropper is connected; connect now
		d.Dropper = sock

		d.mux.Unlock()
	} else {
		// no drop identifier was provided; register a new drop
		d = a.register()
		d.setDropper(sock)

		// let the dropper know the drop identifier
		idMsg := fmt.Sprintf("{\"status\":\"registered\",\"id\":\"%s\"}", d.Uuid)
		sock.WriteMessage(ws.TextMessage, []byte(idMsg))

		fmt.Printf("%s: Registered.\n", d.Uuid)
	}

	defer d.setDropper(nil)

	fmt.Printf("%s: Dropper connected.\n", d.Uuid)
	defer fmt.Printf("%s: Dropper disconnected.\n", d.Uuid)

	for {
		t, msg, err := sock.ReadMessage()
		if err != nil {
			break // close connection
		}

		d.mux.Lock()

		// recipient is connected
		if d.Recipient != nil {
			// attempt to write the incoming message to the recipient
			err := d.Recipient.WriteMessage(t, msg)

			// couldn't message recipient
			if err != nil {
				// write failed message to dropper
				if t == ws.TextMessage {
					failedMsg := fmt.Sprintf("{\"status\":\"failed\",\"data\":%s}", msg)
					err = sock.WriteMessage(ws.TextMessage, []byte(failedMsg))
				} else {
					err = sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"failed\"}"))
				}

				// should be the Recipient's problem; hopefully d.Recipient will be nil next time
				fmt.Printf("%s: Bad recipient.\n", d.Uuid)
			} else {
				fmt.Printf("%s: Dropper -> recipient.\n", d.Uuid)
			}
		} else {
			// recipient is not connected
			// write failed message to dropper
			if t == ws.TextMessage {
				failedMsg := fmt.Sprintf("{\"status\":\"failed\",\"data\":%s}", msg)
				err = sock.WriteMessage(ws.TextMessage, []byte(failedMsg))
			} else {
				err = sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"failed\"}"))
			}
		}

		d.mux.Unlock()

		// one of the inner errors failed
		if err != nil {
			break // close the connection
		}
	}
}

// /receive/:uuid
func (a *Agent) ServeRecipient(w http.ResponseWriter, r *http.Request) {
	// extract the drop identifier from the request URL
	id := r.URL.Path[9:]

	// validate that the id is not-empty
	if len(id) == 0 {
		// if length is less than 10, then no drop identifier was given
		http.Error(w,
			http.StatusText(http.StatusBadRequest),
			http.StatusBadRequest)
		return
	}

	// upgrade request to a WebSocket connection
	sock, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Couldn't upgrade: %v\n", err)
		return
	}
	defer sock.Close() // good to be safe

	d := a.getDrop(id)
	if d == nil {
		// write a 'error' status to the interested recipient
		sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"error\"}"))

		// close the request
		return
	}

	// check if a recipient is already connected
	d.mux.Lock()
	if d.Recipient != nil {
		d.mux.Unlock()

		// write a 'busy' status to the interested dropper
		sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"busy\"}"))

		return
	}

	// no recipient is connected; connect now
	d.Recipient = sock
	defer d.setRecipient(nil)

	d.mux.Unlock()

	fmt.Printf("%s: Recipient connected.\n", d.Uuid)
	defer fmt.Printf("%s: Recipient disconnected.\n", d.Uuid)

	for {
		t, msg, err := sock.ReadMessage()
		if err != nil {
			break // close connection
		}

		d.mux.Lock()

		// dropper is connected
		if d.Dropper != nil {
			// attempt to write the incoming message to the dropper
			err := d.Dropper.WriteMessage(t, msg)

			// couldn't message dropper
			if err != nil {
				// write failed message to recipient
				if t == ws.TextMessage {
					failedMsg := fmt.Sprintf("{\"status\":\"failed\",\"data\":%s}", msg)
					err = sock.WriteMessage(ws.TextMessage, []byte(failedMsg))
				} else {
					err = sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"failed\"}"))
				}

				// should be the Dropper's problem; hopefully d.Dropper will be nil next time
				fmt.Printf("%s: Bad dropper.\n", d.Uuid)
			} else {
				fmt.Printf("%s: Recipient -> dropper.\n", d.Uuid)
			}
		} else {
			// dropper is not connected
			// write failed message to recipient
			if t == ws.TextMessage {
				failedMsg := fmt.Sprintf("{\"status\":\"failed\",\"data\":%s}", msg)
				err = sock.WriteMessage(ws.TextMessage, []byte(failedMsg))
			} else {
				err = sock.WriteMessage(ws.TextMessage, []byte("{\"status\":\"failed\"}"))
			}
		}

		d.mux.Unlock()

		// one of the inner errors failed
		if err != nil {
			break // close the connection
		}
	}
}
