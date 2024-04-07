// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// DataChannel.js

// NOTE: this model is presently unused. It should be considered only when
//       restarting data channels in the event of a network disconnection
//       proves inconsistent and unreliable.

/* DataChannel - Maintain an RTCDataChannel for a Peer, recreating it when
 *               connectivity is lost. Also keeps an internal buffer of sent
 *               messages, so when connectivity is lost, buffered data isn't
 *               lost.
 *
 * public methods:
 *
 * constructor(peer, label) - Create the data channel for a given peer
 *   peer: the peer to create the data channel for
 *   label: the label for the data channel
 *
 * send(data) - Send data through the data channel
 *   data: the data to be sent
 *
 * close() - Close the data channel (destructive)
 *
 * public fields:
 *
 * bufferedAmount - The amount of data not sent
 *
 * dispatches events:
 *
 * 'open' -> Event
 * - The data channel is open, and data is flowing.
 *
 * 'close' -> Event
 * - The data channel is not open; data is not flowing.
 *
 * 'message' -> MessageEvent (event.data is the message data)
 * - A message was received through the data channel.
 *
 * 'bufferedamountlow' -> Event
 * - The buffer is empty
 */
export class DataChannel extends EventTarget {
  // private fields

  _peer = null; // the peer for which this data channel exists
  _label = 'droppr'; // the label of the data channel
  _dataChannel = null; // RTCDataChannel
  _open = false; // whether the data channel is open
  _buffer = []; // the internal buffer of unsent data

  // constructor

  constructor(peer, label) {
    super();

    this._peer = peer;
    this._label = label;
    this._dataChannel = this._peer.createDataChannel();
    this._dataChannelConfigure();

    // on disconnect, reconfigure the data channel
    this._peer.addEventListener('disconnected', () => {
      if (this._dataChannel !== null) {
        this._dataChannel.close();
        this._dataChannel = null;
      }

      this._dataChannel = this._peer.createDataChannel(this._label);
      this._dataChannelConfigure();
    });
  }

  // private methods

  _dataChannelConfigure() {
    this._dataChannel.binaryType = 'arraybuffer'; // receive as ArrayBuffers
    this._dataChannel.addEventListener(
      'message',
      this._onDataChannelMessage.bind(this)
    );
    this._dataChannel.addEventListener(
      'open',
      this._onDataChannelOpen.bind(this)
    );
    this._dataChannel.addEventListener(
      'close',
      this._onDataChannelClose.bind(this)
    );
    this._dataChannel.addEventListener(
      'bufferedamountlow',
      this._onDataChannelBufferedAmountLow.bind(this)
    );
  }

  _onDataChannelMessage(event) {
    this.dispatchEvent(new MessageEvent('message', { data: event.data }));
  }

  _onDataChannelOpen(event) {
    this._open = true;

    // dispatch open event (data will flow)
    this.dispatchEvent(new Event('open'));

    // if the buffer has data, send it through the data channel
    // (this data was lost when the data channel was closed)
    this._buffer.forEach((data) => {
      this._dataChannel.send(data);
    });
  }

  _onDataChannelClose(event) {
    this._open = false;

    // dispatch close event (data won't flow)
    this.dispatchEvent(new Event('close'));
  }

  _onDataChannelBufferedAmountLow() {
    // empty the backup buffer; all messages were sent
    this._buffer = [];

    // dispatch bufferedamountlow event
    this.dispatchEvent(new Event('bufferedamountlow'));
  }

  // public methods

  send(data) {
    // send this data into the backup buffer and through the data channel
    this._buffer.push(data);

    // only send the data if the data channel is open
    if (this._open) {
      this._dataChannel.send(data);
    }
  }

  close() {
    // close the data channel, if it exists
    if (this._dataChannel !== null) {
      this._dataChannel.close();
      this._dataChannel = null;
    }

    // empty the buffer, if it has data in it
    if (this._buffer.length > 0) {
      this._buffer = [];
    }
  }

  get bufferedAmount() {
    if (this._dataChannel !== null) {
      return this._dataChannel.bufferedAmount;
    } else {
      return 0;
    }
  }
}
