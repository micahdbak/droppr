// Peer.js

import { SignalChannel } from './SignalChannel.js';



/**
 * @type {RTCConfiguration}
 */
const RTC_CONFIGURATION = {
  iceServers: [
    {
      urls: 'stun:droppr.net:5051',
    },
    {
      urls: [
        'turn:droppr.net:5051?transport=udp',
        'turn:droppr.net:5051?transport=tcp'
      ],
      username: 'droppr',
      credential: 'droppr'
    }
  ]
};

const BATCH_SIZE = 32;

// for Peer._state
const STATE_READY   = 0; // ready to receive messages
const STATE_WAITING = 1; // waiting for acknowledgement from peer



/**
 * dispatches error, connected, disconnected
 * @extends EventTarget
 */
export class Peer extends EventTarget {



  // for facilitating the WebRTC peer connection
  _isDropper          = false; // whether this instance is the dropper (not the connected peer)
  _signalChannel      = null; // the signal channel connection
  _peerConnection     = null; // the WebRTC peer connection
  _iceRestart         = false; // whether to restart the ICE gathering process
  _moreCandidates     = true; // whether there are more ICE candidates
  _morePeerCandidates = true; // whether the peer has more ICE candidates
  _dataChannel        = null; // data channel through which data is transferred
  
  // state management for sending and receiving messages
  _isConnected = false; // whether or not the peer connection is live
  _state       = STATE_READY; // for Peer.send() and Peer.receive()
  _i           = 0; // index of current message in a batch
  _blob        = new Blob([], { type: 'application/octet-stream' }); // compiled blobs received from peer
  _count       = 0;

  error = null;



  /**
   * @param {boolean} isDropper
   */
  constructor(isDropper) {
    super();

    this._isDropper = isDropper;

    // init signal channel
    this._signalChannel = new SignalChannel();
    this._signalChannelAddEventListeners();

    // init peer connection
    this._peerConnection = new RTCPeerConnection(RTC_CONFIGURATION);
    this._peerConnection.addEventListener('negotiationneeded', this._onNegotiationNeeded.bind(this));
    this._peerConnection.addEventListener('iceconnectionstatechange', this._onIceConnectionStateChange.bind(this));
    this._peerConnection.addEventListener('connectionstatechange', this._onConnectionStateChange.bind(this));
    this._peerConnection.addEventListener('icecandidate', this._onIceCandidate.bind(this));
    this._peerConnection.addEventListener('icecandidateerror', (event) => {
      console.error('ICE candidate error:', event);
    });

    // if dropper, this end should create the data channel
    if (isDropper) {
      this._dataChannel = this._peerConnection.createDataChannel('filestream');
      this._dataChannel.addEventListener('open', this._onDataChannel.bind(this));
    } else {
      this._peerConnection.addEventListener('datachannel', this._onDataChannel.bind(this));
    }
  }



  _signalChannelAddEventListeners() {
    this._signalChannel.addEventListener('error', this._onSignalChannelError.bind(this));
    this._signalChannel.addEventListener('connected', this._onSignalChannelConnected.bind(this));
    this._signalChannel.addEventListener('disconnected', this._onSignalChannelDisconnected.bind(this));
    this._signalChannel.addEventListener('message', this._onSignalChannelMessage.bind(this));
  }



  /**
   * @param {Event} event 
   */
  _onSignalChannelError(event) {
    // signal channel failure is a fatal error
    this.close(); // don't attempt to reconnect
    this.error = new Error('signal channel error', { cause: event.target.error });
    this.dispatchEvent(new Event('error'));
  }



  async _onSignalChannelConnected() {
    try {
      // if dropper, send an RTC peer connection offer
      if (this._isDropper) {
        const offer = await this._peerConnection.createOffer({ iceRestart: this._iceRestart });
        await this._peerConnection.setLocalDescription(offer);

        // send the offer to the recipient
        const packet = { type: 'offer', offer };
        this._signalChannel.send(JSON.stringify(packet));
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _onSignalChannelDisconnected() {
    // when reconnected, ICE gathering should restart
    this._iceRestart = true;
  }



  /**
   * @param {MessageEvent} event - message sent from the signal channel to be processed
   */
  async _onSignalChannelMessage(event) {
    try {
      const message = event.data; // event.data is already parsed with JSON.parse

      switch (message.type) {
        // received an RTC peer connection offer
        case 'offer':
          if (this._isDropper) {
            throw new Error('receiver sent peer connection offer');
          }

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
          if (!this._isDropper) {
            throw new Error('dropper sent peer connection answer');
          }

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
          } else {
            await this._peerConnection.addIceCandidate(message.candidate);
          }

          break;

        default:
          throw new Error('got unexpected message: ' + message);
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _restart() {
    if (this._signalChannel === null) {
      // open the signal channel and add event listeners
      this._signalChannel = new SignalChannel();
      this._signalChannelAddEventListeners();
    }

    if (!this._isDropper) {
      this._dataChannel = null; // will be reopened
    }

    // there will be more and possibly new ICE candidates
    this._moreCandidates = true;
    this._morePeerCandidates = true;
  }



  _onNegotiationNeeded() {
    try {
      this._restart();
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _onIceConnectionStateChange() {
    try {
      console.log(`ICE connection state change: ${this._peerConnection.iceConnectionState}`);

      if (
        this._peerConnection.iceConnectionState === 'disconnected' ||
        this._peerConnection.iceConnectionState === 'failed'
      ) {
        this._isConnected = false;
        this._restart();
        this.dispatchEvent(new Event('disconnected'));
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  _onConnectionStateChange() {
    try {
      console.log(`Connection state change: ${this._peerConnection.connectionState}`);

      if (
        this._peerConnection.connectionState === 'disconnected' ||
        this._peerConnection.connectionState === 'failed'
      ) {
        this._isConnected = false;
        this._restart();
        this.dispatchEvent(new Event('disconnected'));
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @param {RTCPeerConnectionIceEvent} event - contains the ICE candidate
   */
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
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @param {RTCDataChannelEvent|Event} event - contains the WebRTC data channel if RTCDataChannelEvent
   */
  _onDataChannel(event) {
    try {
      if (!this._isDropper) {
        this._dataChannel = event.channel;
      }

      this._dataChannel.binaryType = 'blob'; // receive `Blob`s for binary messages
      this._dataChannel.addEventListener('message', this._onDataChannelMessage.bind(this));
      this._state = STATE_READY;
      this._isConnected = true;
      this.dispatchEvent(new Event('connected'));
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @param {MessageEvent} event - contains the message sent from the peer
   */
  _onDataChannelMessage(event) {
    try {
      const data = event.data;

      if (data instanceof Blob) {
        this._count += data.size;

        if (this._isDropper) {
          throw new Error('got Blob as dropper');
        } else {
          // append it to this._blob for the next call to Peer.receive
          this._blob = new Blob([this._blob, data], { type: 'application/octet-stream' });
          this._i++;

          if (this._i > BATCH_SIZE) {
            throw new Error('dropper sent more messages in batch than allowed');
          }

          this.dispatchEvent(new Event('_blob'));
        }
      } else if (typeof data === 'string') {
        // data is a text message; check if it is an acknowledgement
        if (data === 'ok' && this._state === STATE_WAITING && this._isDropper) {
          this._state = STATE_READY;
          this._i = 0; // ready to send next batch of messages
          this.dispatchEvent(new Event('_ok'));
        } else {
          throw new Error('got unexpected text message: ' + data);
        }
      } else {
        throw new Error('got unexpected message: ' + JSON.stringify(data));
      }
    } catch (err) {
      this.close();
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }



  /**
   * @returns {void}
   */
  close() {
    // close the signal channel
    this._signalChannel?.close();
    this._signalChannel = null;

    // close the WebRTC connection
    this._peerConnection?.close();
    this._peerConnection = null;

    this._dataChannel = null;
  }



  /**
   * @param {Blob} message - the message to send
   * @returns {Promise<void>}
   */
  async send(message) {
    if (!this._isConnected) {
      // wait for connection
      await new Promise((resolve) => {
        const onConnected = () => {
          this.removeEventListener('connected', onConnected);
          resolve();
        };

        this.addEventListener('connected', onConnected);
      });
    }

    if (this._state === STATE_WAITING) {
      // wait for 'ok' message
      await new Promise((resolve) => {
        const onOk = () => {
          this.removeEventListener('_ok', onOk);
          // NOTE: this._state === STATE_READY && this._i === 0
          resolve();
        };

        this.addEventListener('_ok', onOk);
      });
    }

    // send it through the data channel
    this._dataChannel.send(message);
    this._i++; // increment index in batch of messages

    // if sent `BATCH_SIZE` messages, next message should wait for an acknowledgement
    if (this._i === BATCH_SIZE) {
      this._state = STATE_WAITING;
    }
  }



  /**
   * @returns {Promise<Blob>}
   */
  async receive() {
    if (!this._isConnected) {
      // wait for connection
      await new Promise((resolve) => {
        const onConnected = () => {
          this.removeEventListener('connected', onConnected);
          resolve();
        };

        this.addEventListener('connected', onConnected);
      });
    }

    if (this._blob.size === 0) {
      // wait for a message
      await new Promise((resolve) => {
        const onBlob = () => {
          this.removeEventListener('_blob', onBlob);
          resolve();
        };

        this.addEventListener('_blob', onBlob);
      });
    }

    const blob = this._blob;
    this._blob = new Blob([], { type: 'application/octet-stream' });

    if (this._i >= BATCH_SIZE) {
      this._i = 0;

      // NOTE: it *could* be possible that immediately after receiving a blob (the above _blob event)
      // the connection closed before the above code was run, resulting in this._dataChannel being null.
      if (this._dataChannel !== null) {
        this._dataChannel.send('ok'); // send acknowledgement of batch
      } else {
        throw new Error('THE VERY UNLIKELY THING ACTUALLY HAPPENED; PANIC!');
      }
    }

    return blob;
  }
}
