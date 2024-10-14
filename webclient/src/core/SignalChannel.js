// SignalChannel.js

const _pingRate = process.env.REACT_APP_SC_PING_RATE;
const _signalChannelURL = process.env.REACT_APP_SC_URL;

/* SignalChannel - Register a drop identifier and communicate with an inter-
 *                 ested peer. Uses WebSocket connections and a known host.
 *
 * public methods:
 *
 * constructor() - Create the signal channel
 * send(data)    - Send data through the signal channel
 * close()       - Close the signal channel
 *
 * dispatches events:
 *
 * failed       -> Event
 * connected    -> Event
 * disconnected -> MessageEvent
 * close        -> Event
 * message      -> MessageEvent
 */
export class SignalChannel extends EventTarget {
    _webSocket = null; // the WebSocket connection to the signal channel server
    _persist = false; // whether to persist and attempt to reconnect
    _pingInterval = null; // the interval for ping messages
  
    // constructor
  
    constructor() {
      try {
        super(); // construct EventTarget
        this._webSocket = new WebSocket(_signalChannelURL);
        this._webSocketAddEventListeners();
      } catch (err) {
        console.log(`SignalChannel: Error in constructor: ${err.toString()}`);
        this.dispatchEvent(new Event('failed'));
      }
    }
  
    // private methods

    _ping() {
      // if WebSocket is closed
      if (this._webSocket === null) {
        // clear this interval
        clearInterval(this._pingInterval);
        this._pingInterval = null;
  
        // don't ping
        return;
      }
    
      try {
        this._webSocket.send('"ping"');
      } catch (err) {
        console.log(`SignalChannel: Error in _ping: ${err.toString()}`);
      }
    }
  
    _webSocketAddEventListeners() {
      this._webSocket.addEventListener('open', this._onWebSocketOpen.bind(this));
      this._webSocket.addEventListener('close', this._onWebSocketClose.bind(this));
      this._webSocket.addEventListener('message', this._onWebSocketMessage.bind(this));
    }
  
    _onWebSocketOpen() {
      // start pinging
      if (this._pingInterval === null) {
        this._pingInterval = setInterval(this._ping.bind(this), _pingRate);
      }
  
      // was able to connect; should persist on failure
      this._persist = true;
    }
  
    _onWebSocketClose() {
      this._webSocket = null; // free resources
  
      if (this._pingInterval !== null) {
        // clear the ping interval
        clearInterval(this._pingInterval);
        this._pingInterval = null;
      }
  
      // should reconnect
      if (this._persist) {
        this.dispatchEvent(new Event('disconnected'));
    
        try {
          // attempt to reconnect to the signal channel
          this._webSocket = new WebSocket(_signalChannelURL);
          this._webSocketAddEventListeners();
        } catch (err) {
          console.log(`SignalChannel: Error in _onWebSocketClose: ${err.toString()}`);
          this._persist = false; // give up, basically
        }  
      } else {
        // shouldn't reconnect; intentional close
        this.dispatchEvent(new Event('close'));
      }
    }
  
    _onWebSocketMessage(event) {
      try {
        const message = JSON.parse(event.data);
  
        // received a string
        if (typeof message === 'string') {
          if (message === 'ping' || message === 'pong') {
            // stop pinging; other side has connected
            if (this._pingInterval !== null) {
              clearInterval(this._pingInterval);
              this._pingInterval = null;
  
              // dispatch connected event
              this.dispatchEvent(new MessageEvent('connected'));
            }
  
            if (message === 'ping') {
              this._webSocket.send('"pong"'); // send pong
            } else {
              // pass
            }
          } else {
            throw new Error('Bad message.');
          }
  
          // received an object
        } else if (typeof message === 'object') {
          switch (message.status) {
            // dropper or recipient is already connected for this drop
            case 'busy':
              this.dispatchEvent(new Event('failed'));
              this.close(); // free resources
  
              break;
  
            // the signal channel has failed to send a message to the other end
            case 'failed':
              if (this._pingInterval === null) {
                // dispatch disconnected event
                this.dispatchEvent(
                  new MessageEvent('disconnected', { data: message.data })
                );
  
                // start pinging again
                this._pingInterval = setInterval(this._ping, _pingRate);
  
                // check if this was for a non-ping message
              }

              // if already pinging, ignore the failed message
  
              break;
  
            // the signal channel has passed along a message from the peer
            default:
              // dispatch message event
              this.dispatchEvent(new MessageEvent('message', { data: message }));
  
              break;
          }
        } else {
          throw new Error('Message must be a string or object.');
        }
      } catch (err) {
        // log the error to console
        console.log(`SignalChannel: Error in _onWebSocketMessage: ${err.toString()}`);
      }
    }
  
    // public methods
  
    send(data) {
      // don't send the message when not connected
      if (this._webSocket === null || this._pingInterval !== null) {
        throw new Error('Not connected.');
      }
  
      this._webSocket.send(data);
    }
  
    close() {
      // don't persist and attempt to reconnect after closing the WebSocket
      this._persist = false;
  
      // stop pinging the WebSocket
      if (this._pingInterval !== null) {
        clearInterval(this._pingInterval);
        this._pingInterval = null;
      }
  
      // close the WebSocket connection
      if (this._webSocket !== null) {
        this._webSocket.close();
        this._webSocket = null;
      }
    }
  }