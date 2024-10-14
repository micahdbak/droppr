// Peer.js

import { SignalChannel } from './SignalChannel.js';

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
    }
  ]
};

/* Peer - Communicate with a peer. Uses WebRTC for data transfer, and WebSocket
 *        connections to facilitate WebRTC connection via signal channel.
 *
 * public methods:
 *
 * constructor(isDropper)   - Create the peer connection
 * close()                  - Close the peer connection
 * createDataChannel(label) - Create an RTCDataChannel in the peer connection
 *
 * dispatches events:
 *
 * failed       -> Event
 * connected    -> Event
 * disconnected -> Event
 * datachannel  -> RTCDataChannelEvent
 */
export class Peer extends EventTarget {
  _signalChannel; // the signal channel connection
  _peerConnection; // the WebRTC peer connection
  _isDropper; // whether this instance is the dropper (not the connected peer)
  _moreCandidates = true; // whether there are more ICE candidates
  _morePeerCandidates = true; // whether the peer has more ICE candidates
  _iceRestart = false; // whether to restart the ICE gathering process

  // constructor

  constructor(isDropper) {
    super();

    this._isDropper = isDropper;

    // init signal channel
    this._signalChannel = new SignalChannel();
    this._signalChannelAddEventListeners();

    // init peer connection
    this._peerConnection = new RTCPeerConnection(_configuration);
    this._peerConnection.addEventListener('negotiationneeded', this._onNegotiationNeeded.bind(this));
    this._peerConnection.addEventListener('iceconnectionstatechange', this._onIceConnectionStateChange.bind(this));
    this._peerConnection.addEventListener('connectionstatechange', this._onConnectionStateChange.bind(this));
    this._peerConnection.addEventListener('icecandidate', this._onIceCandidate.bind(this));
    this._peerConnection.addEventListener('datachannel', this._onDataChannel.bind(this));
  }

  // private methods

  _signalChannelAddEventListeners() {
    this._signalChannel.addEventListener('failed', this._onSignalChannelFailed.bind(this));
    this._signalChannel.addEventListener('connected', this._onSignalChannelConnected.bind(this));
    this._signalChannel.addEventListener('disconnected', this._onSignalChannelDisconnected.bind(this));
    this._signalChannel.addEventListener('close', this._onSignalChannelClose.bind(this));
    this._signalChannel.addEventListener('message', this._onSignalChannelMessage.bind(this));
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
        const offer = await this._peerConnection.createOffer({ iceRestart: this._iceRestart });
        this._peerConnection.setLocalDescription(offer);

        // send the offer to the recipient
        const packet = { type: 'offer', offer };
        this._signalChannel.send(JSON.stringify(packet));
      } catch (err) {
        // log the caught error
        console.log(`Peer: Error in _onSignalChannelConnected: ${err.toString()}`);
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
      const message = event.data; // event.data is already parsed with JSON.parse

      switch (message.type) {
        // received an RTC peer connection offer
        case 'offer':
          if (this._isDropper) {
            console.log('Peer Warning: signal channel received offer when self is dropper.');
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
            console.log('Peer Warning: signal channel received answer when self is receiver.');
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
    }

    // there will be more and possibly new ICE candidates
    this._moreCandidates = true;
    this._morePeerCandidates = true;
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
