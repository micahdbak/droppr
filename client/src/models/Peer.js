// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Peer.js

// get current environment variables
const _webSocketScheme = process.env.REACT_APP_SC_WS_SCHEME;
//const _restScheme = process.env.REACT_APP_SC_REST_SCHEME;
const _host = process.env.REACT_APP_SC_HOST;
const _pingRate = process.env.REACT_APP_SC_PING_RATE;

const _webSocketRoot = _webSocketScheme + '://' + _host;
//const _restRoot = _restScheme + '://' + _host;

const _turnUsername = process.env.REACT_APP_TURN_USERNAME;
const _turnCredential = process.env.REACT_APP_TURN_CREDENTIAL;

// STUN and TURN server configuration for RTCPeerConnection
const _configuration = {
  iceServers: [
    {
      // public Google STUN servers
      urls: [
        'stun:stun.l.google.com:19302',
        'stun:stun1.l.google.com:19302',
        'stun:stun2.l.google.com:19302',
        'stun:stun3.l.google.com:19302',
        'stun:stun4.l.google.com:19302'
      ]
    },
    {
      // droppr STUN server
      urls: 'stun:relay.droppr.net:5051'
    },
    {
      // droppr TURN server (relay messages if peer-to-peer is impossible)
      urls: 'turn:relay.droppr.net:5051',
      username: _turnUsername,
      credential: _turnCredential
    }
  ]
};

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
class SignalChannel extends EventTarget {
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
      console.log(
        `SignalChannel: Error in _onWebSocketMessage: ${err.toString()}`
      );
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

/* Peer - Communicate with a peer. Uses WebRTC for data transfer, and WebSocket
 *        connections to facilitate WebRTC communication.
 *
 * public methods:
 *
 * constructor(id) - Create the peer connection
 *   id: the drop identifier; define to act as a recipient peer, leave
 *       undefined for a dropper peer.
 *
 * close() - Close the peer connection
 *
 * createDataChannel(label) - Create an RTCDataChannel with the peer
 *   label: the label for the data channel
 *
 * public fields:
 *
 * id - The drop identifier
 *
 * dispatches events:
 *
 * 'registered' -> MessageEvent (event.data contains the drop id.)
 * - The signal channel has issued a drop identifier. (Only occurs when id
 *   isn't given in the constructor.)
 *
 * 'failed' -> Event
 * - The peer failed to connect due to a busy drop identifier, or terrible
 *   network conditions. No further attempts to connect will be made once
 *   this event is dispatched; the caller should start from scratch.
 *
 * 'connected' -> Event
 * - The 'other end' (dropper or recipient) has connected over WebRTC.
 *
 * 'disconnected' -> Event
 * - The 'other end' (dropper or recipient) has disconnected over WebRTC.
 *   Renegotiation of the connection will begin immediately. The connected
 *   event will be dispatched when reconnected.
 *
 * 'datachannel' -> RTCDataChannelEvent (event.channel is an RTCDataChannel.)
 * - The peer has created a data channel to communicate with.
 */
export class Peer extends EventTarget {
  // public fields

  id; // the drop identifier

  // private fields

  _signalChannel; // the signal channel connection
  _peerConnection; // the WebRTC peer connection

  _isDropper; // whether this instance is the dropper (not the connected peer)

  _moreCandidates = true; // whether there are more ICE candidates
  _morePeerCandidates = true; // whether the peer has more ICE candidates
  _iceRestart = false; // whether to restart the ICE gathering process

  // constructor

  constructor(id) {
    super();

    this._isDropper = id === undefined;

    // init communication objects
    this._signalChannel = new SignalChannel(id, this._isDropper);
    this._peerConnection = new RTCPeerConnection(_configuration);

    // init public fields
    this.id = id;

    // event listeners
    this._signalChannelAddEventListeners();

    // WebRTC peer connection event listeners
    this._peerConnection.addEventListener(
      'negotiationneeded',
      this._onNegotiationNeeded.bind(this)
    );
    this._peerConnection.addEventListener(
      'iceconnectionstatechange',
      this._onIceConnectionStateChange.bind(this)
    );
    this._peerConnection.addEventListener(
      'connectionstatechange',
      this._onConnectionStateChange.bind(this)
    );
    this._peerConnection.addEventListener(
      'icecandidate',
      this._onIceCandidate.bind(this)
    );
    this._peerConnection.addEventListener(
      'datachannel',
      this._onDataChannel.bind(this)
    );
  }

  // private methods

  _signalChannelAddEventListeners() {
    // add event listeners for the signal channel
    this._signalChannel.addEventListener(
      'registered',
      this._onSignalChannelRegistered.bind(this)
    );
    this._signalChannel.addEventListener(
      'failed',
      this._onSignalChannelFailed.bind(this)
    );
    this._signalChannel.addEventListener(
      'connected',
      this._onSignalChannelConnected.bind(this)
    );
    this._signalChannel.addEventListener(
      'disconnected',
      this._onSignalChannelDisconnected.bind(this)
    );
    this._signalChannel.addEventListener(
      'close',
      this._onSignalChannelClose.bind(this)
    );
    this._signalChannel.addEventListener(
      'message',
      this._onSignalChannelMessage.bind(this)
    );
  }

  _onSignalChannelRegistered(event) {
    // store the drop identifier internally
    this.id = event.data;
    this.dispatchEvent(new MessageEvent('registered', { data: event.data }));
  }

  _onSignalChannelFailed() {
    // signal channel failure is a fatal error
    this.dispatchEvent(new Event('failed'));
    this.close(); // don't attempt to reconnect
  }

  async _onSignalChannelConnected() {
    // if dropper, send an RTC peer connection offer
    if (this._isDropper) {
      try {
        // the dropper should send the initial offer
        const offer = await this._peerConnection.createOffer({
          iceRestart: this._iceRestart
        });
        this._peerConnection.setLocalDescription(offer);

        // send the offer to the recipient
        const packet = { type: 'offer', offer };
        this._signalChannel.send(JSON.stringify(packet));
      } catch (err) {
        // log the caught error
        console.log(
          `Peer: Error in _onSignalChannelConnected: ${err.toString()}`
        );
      }
    }
  }

  _onSignalChannelDisconnected() {
    // the signal channel will automatically reconnect;
    // when reconnected, ICE gathering should restart
    this._iceRestart = true;
  }

  _onSignalChannelClose() {
    // next open of the signal channel should restart the ICE gathering process
    this._iceRestart = true;
  }

  async _onSignalChannelMessage(event) {
    try {
      const message = event.data;

      switch (message.type) {
        // received an RTC peer connection offer
        case 'offer':
          // set remote description
          this._peerConnection.setRemoteDescription(message.offer);

          // prepare answer
          const answer = await this._peerConnection.createAnswer();
          this._peerConnection.setLocalDescription(answer);

          // send the answer to the dropper
          const packet = { type: 'answer', answer };
          this._signalChannel.send(JSON.stringify(packet));

          break;

        // received an RTC peer connection answer
        case 'answer':
          // set remote description
          this._peerConnection.setRemoteDescription(message.answer);

          break;

        // received an ICE candidate
        case 'candidate':
          // check for end-of-candidates signal
          if (message.candidate === null) {
            this._morePeerCandidates = false;

            // close signal channel if there are no more candidates
            if (!this._moreCandidates) {
              this._signalChannel.close();
              this._signalChannel = null;
            }
          }

          // if message.candidate is null, this signals end-of-candidates
          this._peerConnection.addIceCandidate(message.candidate);

          break;

        default:
          console.log(`Peer: Got unexpected message: ${message}`);

          break;
      }
    } catch (err) {
      console.log(`Peer: Error in _onSignalChannelMessage: ${err.toString()}`);
    }
  }

  _restart() {
    if (this._signalChannel === null) {
      // open the signal channel and add event listeners
      this._signalChannel = new SignalChannel(this.id, this._isDropper);
      this._signalChannelAddEventListeners();

      // there will be more and possibly new ICE candidates
      this._moreCandidates = true;
      this._morePeerCandidates = true;
    }
  }

  _onNegotiationNeeded() {
    this._restart();
  }

  _onIceConnectionStateChange() {
    console.log(
      `Peer: Info: ICE connection state change: ${this._peerConnection.iceConnectionState}`
    );

    // check for a disconnected or failed state
    if (
      this._peerConnection.iceConnectionState === 'disconnected' ||
      this._peerConnection.iceConnectionState === 'failed'
    ) {
      this.dispatchEvent(new Event('disconnected'));
      this._restart();
    }
  }

  _onConnectionStateChange() {
    console.log(
      `Peer: Info: Connection state change: ${this._peerConnection.connectionState}`
    );

    // WebRTC is connected
    if (this._peerConnection.connectionState === 'connected') {
      this.dispatchEvent(new Event('connected'));

      // check for a disconnected or failed state
    } else if (
      this._peerConnection.connectionState === 'disconnected' ||
      this._peerConnection.connectionState === 'failed'
    ) {
      this.dispatchEvent(new Event('disconnected'));
      this._restart();
    }
  }

  _onIceCandidate(event) {
    try {
      const packet = { type: 'candidate', candidate: event.candidate };
      this._signalChannel.send(JSON.stringify(packet));

      // check for end-of-candidates signal
      if (event.candidate === null) {
        this._moreCandidates = false;

        // close signal channel if the peer has no more candidates
        if (!this._morePeerCandidates) {
          this._signalChannel.close();
          this._signalChannel = null;
        }
      }
    } catch (err) {
      console.log(`Peer: Error in _onIceCandidate: ${err.toString()}`);
    }
  }

  _onDataChannel(event) {
    this.dispatchEvent(
      new RTCDataChannelEvent('datachannel', { channel: event.channel })
    );
  }

  // public methods

  close() {
    // close the WebRTC connection
    if (this._peerConnection !== null) {
      this._peerConnection.close();
      this._peerConnection = null;
    }

    // close the signal channel
    if (this._signalChannel !== null) {
      this._signalChannel.close();
      this._signalChannel = null;
    }
  }

  createDataChannel(label) {
    return this._peerConnection.createDataChannel(label);
  }
}
