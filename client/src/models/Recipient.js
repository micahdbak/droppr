// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Recipient.js

import { Peer } from './index.js';

/* Recipient - Receive a file
 *
 * public methods:
 *
 * constructor(id) - Receive a file given a drop identifier.
 *   id: the drop identifier
 *
 * dispatches events:
 *
 * 'open' -> Event
 * - The connection is open. Data is now flowing.
 *
 * 'fileinfo' -> MessageEvent
 * - File information about what is being downloaded. Has name, size, and type
 *   fields.
 *
 * 'close' -> Event
 * - The connection was closed. Will reconnect if file isn't received.
 *
 * 'download' -> MessageEvent (event.data: { href, name, size, type }.)
 * - The file was downloaded
 */
export class Recipient extends EventTarget {
  // private fields

  _peer = null; // the peer connection
  _builder = null; // the file builder (Web Worker)
  _dc = null; // the data channel
  _blob = null; // the file as it's being built
  _fileinfo = {}; // the information about the file being received

  // constructor

  constructor(id) {
    super();

    this._peer = new Peer(id);

    // on data channel negotiated
    this._peer.addEventListener('datachannel', (event) => {
      this._dc = event.channel;
      this._dc.addEventListener('message', this._onDcMessage.bind(this));
    });

    // on WebRTC peer connected disconnected
    this._peer.addEventListener('disconnected', () => {
      this._dc = null; // old data channel is dead
    });
  }

  _onDcMessage(event) {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'fileinfo':
          this._fileinfo = message.fileinfo;
          this.dispatchEvent(
            new MessageEvent('fileinfo', { data: message.fileinfo })
          );

          break;

        case 'done':
          this._dc.send('{"type":"received"}');

          // close everything; drop is complete

          this._dc.close();
          this._dc = null;

          this._peer.close();
          this._peer = null;

          const href = URL.createObjectURL(
            new Blob([this._blob], { type: this._fileinfo.type })
          );

          // free this reference
          this._blob = null;

          // dispatch event with download information
          this.dispatchEvent(
            new MessageEvent('download', { data: { href, ...this._fileinfo } })
          );

          break;
      }
    } else if (event.data instanceof ArrayBuffer) {
      if (this._blob !== null) {
        // build blob with this new part
        this._blob = new Blob([this._blob, event.data]);
      } else {
        this._blob = new Blob([event.data]);
      }
    } else {
      console.log(`Got unexpected data: ${event.data}`);
    }
  }
}
