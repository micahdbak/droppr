// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Peer.js

import { SignalChannel } from './SignalChannel.js';

// STUN and TURN server configuration for RTCPeerConnection
const _configuration = {
  iceServers: [
    {
      urls: "stun:relay.droppr.net:5051",
    },
    {
      urls: "turn:relay.droppr.net:5051",
      username: "droppr",
      credential: "p2pfiletransfer"
    },
  ]
};

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

  _sc;  // the signal channel connection
  _rtc; // the WebRTC peer connection
  _dc;  // the data channel for the WebRTC peer connection

  _isDropper; // whether this instance is the dropper (not the connected peer)

  _moreCandidates     = true;  // whether there are more ICE candidates
  _morePeerCandidates = true;  // whether the peer has more ICE candidates
  _iceRestart         = false; // whether to restart the ICE gathering process

  // constructor

  constructor(id) {
    super();

    this._isDropper = id === undefined;

    // init communication objects
    this._sc = new SignalChannel(id, this._isDropper);
    this._rtc = new RTCPeerConnection(_configuration);

    // init public fields
    this.id = id;

    // event listeners
    this._scAddEventListeners();

    // WebRTC peer connection event listeners
    this._rtc.addEventListener(
      'negotiationneeded',
      this._onNegotiationNeeded.bind(this),
    );
    this._rtc.addEventListener(
      'iceconnectionstatechange',
      this._onIceConnectionStateChange.bind(this)
    );
    this._rtc.addEventListener(
      'connectionstatechange',
      this._onConnectionStateChange.bind(this)
    );
    this._rtc.addEventListener('icecandidate', this._onIceCandidate.bind(this));
    this._rtc.addEventListener('datachannel', this._onDataChannel.bind(this));
  }

  // private methods

  _scAddEventListeners() {
    // add event listeners for the signal channel
    this._sc.addEventListener('registered', this._onScRegistered.bind(this));
    this._sc.addEventListener('failed', this._onScFailed.bind(this));
    this._sc.addEventListener('connected', this._onScConnected.bind(this));
    this._sc.addEventListener('disconnected', this._onScDisconnected.bind(this));
    this._sc.addEventListener('close', this._onScClose.bind(this));
    this._sc.addEventListener('message', this._onScMessage.bind(this));
  }

  _onScRegistered(event) {
    // store the drop identifier internally
    this.id = event.data;
    this.dispatchEvent(new MessageEvent('registered', { data: event.data }));
  }

  _onScFailed() {
    // signal channel failure is a fatal error
    this.dispatchEvent(new Event('failed'));
    this.close(); // don't attempt to reconnect
  }

  async _onScConnected() {
    // if dropper, send an RTC peer connection offer
    if (this._isDropper) {
      try {
        // the dropper should send the initial offer
        const offer = await this._rtc.createOffer({
          iceRestart: this._iceRestart
        });
        this._rtc.setLocalDescription(offer);

        // send the offer to the recipient
        const packet = { type: 'offer', offer };
        this._sc.send(JSON.stringify(packet));
      } catch (err) {
        // log the caught error
        console.log(err);
      }
    }
  }

  _onScDisconnected() {
    // the signal channel will automatically reconnect;
    // when reconnected, ICE gathering should restart
    this._iceRestart = true;
  }

  _onScClose() {
    // next open of the signal channel should restart the ICE gathering process
    this._iceRestart = true;
  }

  async _onScMessage(event) {
    try {
      const message = event.data;

      switch (message.type) {
        // received an RTC peer connection offer
        case 'offer':
          // set remote description
          this._rtc.setRemoteDescription(message.offer);

          // prepare answer
          const answer = await this._rtc.createAnswer();
          this._rtc.setLocalDescription(answer);

          // send the answer to the dropper
          const packet = { type: 'answer', answer };
          this._sc.send(JSON.stringify(packet));

          break;

        // received an RTC peer connection answer
        case 'answer':
          // set remote description
          this._rtc.setRemoteDescription(message.answer);

          break;

        // received an ICE candidate
        case 'candidate':
          // check for end-of-candidates signal
          if (message.candidate === null) {
            this._morePeerCandidates = false;

            // close signal channel if there are no more candidates
            if (!this._moreCandidates) {
              this._sc.close();
              this._sc = null;
            }
          }

          // if message.candidate is null, this signals end-of-candidates
          this._rtc.addIceCandidate(message.candidate);

          break;

        default:
          console.log(`Peer: Warning: Got unexpected message: ${message}`);

          break;
      }
    } catch (err) {
      console.log(err);
      console.log(event.data);
    }
  }

  _restart() {
    if (this._sc === null) {
      // open the signal channel and add event listeners
      this._sc = new SignalChannel(this.id, this._isDropper);
      this._scAddEventListeners();

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
      `Peer: Info: ICE connection state change: ${this._rtc.iceConnectionState}`
    );

    // check for a disconnected or failed state
    if (
      this._rtc.iceConnectionState === 'disconnected' ||
      this._rtc.iceConnectionState === 'failed'
    ) {
      this.dispatchEvent(new Event('disconnected'));
      this._restart();
    }
  }

  _onConnectionStateChange() {
    console.log(
      `Peer: Info: Connection state change: ${this._rtc.connectionState}`
    );

    // WebRTC is connected
    if (this._rtc.connectionState === 'connected') {
      this.dispatchEvent(new Event('connected'));

    // check for a disconnected or failed state
    } else if (
      this._rtc.connectionState === 'disconnected' ||
      this._rtc.connectionState === 'failed'
    ) {
      this.dispatchEvent(new Event('disconnected'));
      this._restart();
    }
  }

  _onIceCandidate(event) {
    try {
      const packet = { type: 'candidate', candidate: event.candidate };
      this._sc.send(JSON.stringify(packet));

      // check for end-of-candidates signal
      if (event.candidate === null) {
        this._moreCandidates = false;

        // close signal channel if the peer has no more candidates
        if (!this._morePeerCandidates) {
          this._sc.close();
          this._sc = null;
        }
      }
    } catch (err) {
      console.log(err);
    }
  }

  _onDataChannel(event) {
    this.dispatchEvent(new RTCDataChannelEvent('datachannel', { channel: event.channel }));
  }

  // public methods

  close() {
    // close the WebRTC connection
    if (this._rtc !== null) {
      this._rtc.close();
      this._rtc = null;
    }

    // close the signal channel
    if (this._sc !== null) {
      this._sc.close();
      this._sc = null;
    }
  }

  createDataChannel(label) {
    return this._rtc.createDataChannel(label);
  }
}
