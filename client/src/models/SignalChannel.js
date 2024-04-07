// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// SignalChannel.js

// get current environment variables
const _webSocketScheme = process.env.REACT_APP_SC_WS_SCHEME;
//const _restScheme = process.env.REACT_APP_SC_REST_SCHEME;
const _host = process.env.REACT_APP_SC_HOST;
const _pingRate = process.env.REACT_APP_SC_PING_RATE;

const _webSocketRoot = _webSocketScheme + '://' + _host;
//const _restRoot = _restScheme + '://' + _host;

/* SignalChannel - Register a drop identifier and communicate with an inter-
 *                 ested peer. Uses WebSocket connections and a known host.
 *
 * public methods:
 *
 * constructor(id) - Create the signal channel
 *   id: the drop identifier; define for recipient signal channel, leave
 *       undefined for dropper signal channel.
 *
 * send(data) - Send data through the signal channel
 *   data: the data to be sent to the other end.
 *
 * close() - Close the signal channel
 *
 * public fields:
 *
 * id - The drop identifier
 *
 * dispatches events:
 *
 * 'registered' -> MessageEvent (event.data contains the drop id.)
 * - The server has provided a drop identifier. (Only occurs when id isn't
 *   given in the constructor.)
 *
 * 'failed' -> Event
 * - The signal channel failed to connect. No further attempts to connect will
 *   be made; the caller should start from scratch.
 *
 * 'connected' -> Event
 * - The 'other end' (dropper or recipient) of the signal channel has connected.
 *
 * 'disconnected' -> MessageEvent (event.data may contain a message that was
 *                   lost as a result of the disconnection.)
 * - Either the other end of the signal channel has disconnected, or the
 *   WebSocket has closed accidentally. An attempt to reconnect the WebSocket
 *   and wait for the other end to connect will begin immediately.
 *
 * 'close' -> Event
 * - The WebSocket was intentionally closed.
 *
 * 'message' -> MessageEvent (event.data contains the message data.)
 * - A message is received.
 */
export class SignalChannel extends EventTarget {
  // public fields

  id; // the drop identifier

  // private fields

  _webSocket = null; // the WebSocket connection to the signal channel server

  _isDropper; // whether this connection is for a dropper

  _persist = false; // whether to persist and attempt to reconnect
  _pingInterval = null; // the interval for ping messages

  // constructor

  constructor(id, isDropper) {
    super();

    this._isDropper = isDropper;

    if (id === undefined) {
      // attempt to connect to the signal channel as a new drop
      this._webSocket = new WebSocket(_webSocketRoot + '/drop/');
    } else {
      this.id = id;

      if (isDropper) {
        // attempt to connect to the signal channel as a dropper
        this._webSocket = new WebSocket(_webSocketRoot + '/drop/' + this.id);
      } else {
        // attempt to connect to the signal channel as a recipient
        this._webSocket = new WebSocket(_webSocketRoot + '/receive/' + this.id);
      }
    }

    this._persist = true;

    // add event listeners for open, close, and message events
    this._webSocket.addEventListener('open', this._onWebSocketOpen.bind(this));
    this._webSocket.addEventListener(
      'close',
      this._onWebSocketClose.bind(this)
    );
    this._webSocket.addEventListener(
      'message',
      this._onWebSocketMessage.bind(this)
    );
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

    this._webSocket.send('"ping"');
  }

  _onWebSocketOpen() {
    // start pinging
    if (this._pingInterval === null) {
      this._pingInterval = setInterval(this._ping.bind(this), _pingRate);
    }
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

      // attempt to reconnect to the signal channel
      if (this._isDropper) {
        this._webSocket = new WebSocket(_webSocketRoot + '/drop/' + this.id);
      } else {
        this._webSocket = new WebSocket(_webSocketRoot + '/receive/' + this.id);
      }

      // add event listeners for open, close, and message events
      this._webSocket.addEventListener('open', this._onWebSocketOpen);
      this._webSocket.addEventListener('close', this._onWebSocketClose);
      this._webSocket.addEventListener('message', this._onWebSocketMessage);

      // shouldn't reconnect; intentional close
    } else {
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

            // got pong when already connected
            // shouldn't have sent a ping if connected, anyways
          } else {
            // write this off as a warning
            console.log(
              'SignalChannel Warning: ' +
                'Got ping message when already determined as connected.'
            );
          }

          if (message === 'ping') {
            this._webSocket.send('"pong"'); // send pong
          }
        } else {
          throw new Error('Bad message.');
        }

        // received an object
      } else if (typeof message === 'object') {
        switch (message.status) {
          // the drop was registered and a drop identifier was given
          case 'registered':
            if (this._isDropper) {
              this.id = message.id; // set the given drop identifier

              // dispatch registered event
              this.dispatchEvent(
                new MessageEvent('registered', { data: this.id })
              );
            } else {
              // write this off as a warning
              console.log(
                'SignalChannel Warning: Received registered message as recipient.'
              );
            }

            break;

          // drop doesn't exist
          case 'error':
            this.dispatchEvent(new Event('failed'));
            this.close(); // free resources

            break;

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
            } else if (message.data !== 'ping') {
              // write this off as a warning
              console.log(
                'SignalChannel Warning: ' +
                  'Failed to send message when already determined as disconnected.'
              );
            }

            break;

          // the signal channel has passed along a message from the other end
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
      console.log(err);
      console.log(event.data);
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
