// SignalChannel.js

const PING_RATE = 1000; // 1s

const SC_URL = 'wss://droppr.net/sc';



/**
 * dispatches error, connected, disconnected, message
 * @extends EventTarget
 */
export class SignalChannel extends EventTarget {



  _webSocket = null; // the WebSocket connection to the signal channel server
  _persist = false; // whether to persist and attempt to reconnect
  _pingInterval = null; // the interval for ping messages
  error = null;



  constructor() {
    super(); // construct EventTarget
    this._webSocket = new WebSocket(SC_URL);
    this._webSocketAddEventListeners();
  }



  _ping() {
    try {
      // if WebSocket is closed
      if (this._webSocket === null) {
        // clear this interval
        clearInterval(this._pingInterval);
        this._pingInterval = null;
  
        // don't ping
        return;
      }

      this._webSocket.send('"ping"');
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _webSocketAddEventListeners() {
    this._webSocket.addEventListener('open', this._onWebSocketOpen.bind(this));
    this._webSocket.addEventListener('close', this._onWebSocketClose.bind(this));
    this._webSocket.addEventListener('message', this._onWebSocketMessage.bind(this));
  }



  _onWebSocketOpen() {
    try {
      // start pinging
      if (this._pingInterval === null) {
        this._pingInterval = setInterval(this._ping.bind(this), PING_RATE);
      }

      // was able to connect; should persist on failure
      this._persist = true;
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _onWebSocketClose() {
    try {
      this._webSocket = null; // free resources

      if (this._pingInterval !== null) {
        // clear the ping interval
        clearInterval(this._pingInterval);
        this._pingInterval = null;
      }

      if (this._persist) {
        // attempt to reconnect to the signal channel
        this._webSocket = new WebSocket(SC_URL);
        this._webSocketAddEventListeners();
      }

      this.dispatchEvent(new Event('disconnected'));
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @param {MessageEvent} event 
   */
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
          }
        } else {
          throw new Error('bad message: ' + message);
        }

        // received an object
      } else if (typeof message === 'object') {
        switch (message.status) {
          // dropper or recipient is already connected for this drop
          case 'busy':
            throw new Error('busy');

          // the signal channel has failed to send a message to the other end
          case 'failed':
            if (this._pingInterval === null) {
              // dispatch disconnected event
              this.dispatchEvent(new MessageEvent('disconnected', { data: message.data }));

              // start pinging again
              this._pingInterval = setInterval(this._ping, PING_RATE);
            }

            break;

          // the signal channel has passed along a message from the peer
          default:
            // dispatch message event
            this.dispatchEvent(new MessageEvent('message', { data: message }));

            break;
        }
      } else {
        throw new Error('received unexpected message: ' + message);
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @param {string} data 
   */
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
    this._webSocket?.close();
    this._webSocket = null;
  }
}
