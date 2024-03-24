package agent

import (
	"fmt"
	"io"
	"net/http"
	"strconv"
	"sync"
	ws "github.com/gorilla/websocket"
)

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

// TODO: use randomly generated strings
var nextDropId int // = 0

// private functions

// register a drop (make open for recipients)
func (a *Agent) register() *drop {
	a.mux.Lock()
	defer a.mux.Unlock()

	// make a new drop
	d := new(drop)

	// get next drop id
	d.Id = nextDropId
	nextDropId++

	// register this drop
	a.drops[d.Id] = d

	return d
}

// unregister a drop (make not available for recipients)
func (a *Agent) unregister(id int) {
	a.mux.Lock()
	defer a.mux.Unlock()

	// unregister this drop
	a.drops[id] = nil
}

// get a drop given a drop id
func (a *Agent) getDrop(id int) *drop {
	a.mux.Lock()
	defer a.mux.Unlock()

	return a.drops[id]
}

// public functions

func (a *Agent) Init() {
	a.drops = make(map[int]*drop)
	fmt.Printf("Started the Signal Channel Agent.\n")
}

func (a *Agent) ServePing(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Pong"))
}

// /drop
func (a *Agent) ServeDropper(w http.ResponseWriter, r *http.Request) {
	sock, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Couldn't upgrade: %v\n", err)
		return
	}
	defer sock.Close() // good to be safe

	// register this drop
	d := a.register()

	d.setDropper(sock)
	defer d.setDropper(nil)

	// let the dropper know the drop identifier
	idMsg := []byte(strconv.Itoa(d.Id))
	sock.WriteMessage(ws.TextMessage, idMsg)

	fmt.Printf("Dropper joining %d\n", d.Id)

	for {
		t, r, err := sock.NextReader()
		if err != nil {
			break // close connection
		}

		d.mux.Lock()

		if d.Recipient != nil {
			w, err := d.Recipient.NextWriter(t)
			if err == nil {
				_, err = io.Copy(w, r)
				w.Close()
			}

			if err != nil {
				fmt.Printf("BAD ERROR 1\n")
				d.mux.Unlock()
				continue // should be the Recipient's problem
			}
		} else {
			err = sock.WriteMessage(ws.TextMessage, []byte("waiting"))
			if err != nil {
				d.mux.Unlock()
				break
			}
		}

		d.mux.Unlock()
	}

	fmt.Printf("Dropper leaving %d\n", d.Id)
}

// /receive/:id
func (a *Agent) ServeRecipient(w http.ResponseWriter, r *http.Request) {
	if len(r.URL.Path) < 10 {
		http.Error(w,
			http.StatusText(http.StatusBadRequest),
			http.StatusBadRequest)
		return
	}

	id, err := strconv.Atoi(r.URL.Path[9:])
	if err != nil {
		http.Error(w,
			http.StatusText(http.StatusBadRequest),
			http.StatusBadRequest)
		return
	}
	// id is drop identifier

	d := a.getDrop(id)
	if d == nil {
		http.Error(w,
			http.StatusText(http.StatusBadRequest),
			http.StatusBadRequest)
		return
	}

	sock, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		fmt.Printf("Couldn't upgrade: %v\n", err)
		return
	}
	defer sock.Close() // good to be safe

	d.setRecipient(sock)
	defer d.setRecipient(nil)

	fmt.Printf("Recipient joining %d\n", d.Id)

	for {
		t, r, err := sock.NextReader()
		if err != nil {
			break // close connection
		}

		d.mux.Lock()

		if d.Dropper != nil {
			w, err := d.Dropper.NextWriter(t)
			if err == nil {
				_, err = io.Copy(w, r)
				w.Close()
			}

			if err != nil {
				fmt.Printf("BAD ERROR 2\n")
				d.mux.Unlock()
				continue // should be the Dropper's problem
			}
		} else {
			err = sock.WriteMessage(ws.TextMessage, []byte("waiting"))
			if err != nil {
				d.mux.Unlock()
				break
			}
		}

		d.mux.Unlock()
	}

	fmt.Printf("Recipient leaving %d\n", d.Id)
}
