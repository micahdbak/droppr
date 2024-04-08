// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Recipient.js

import { FileStore, Peer } from './index.js';

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
 * 'bytes' -> MessageEvent (event.data has bytes got.)
 * - An update on the number of bytes got.
 *
 * 'download' -> MessageEvent (event.data: { href, name, size, type }.)
 * - The file was downloaded
 */
export class Recipient extends EventTarget {
  // private fields

  _peer = null; // the peer connection
  _fileStore = null; // the file store

  _fileinfo = {}; // label -> file information
  _offset = {}; // label -> current offset
  _blob = {}; // label -> pending blob
  _request = {}; // label -> current database request

  // constructor

  constructor(id) {
    super();

    // open the file store database
    this._fileStore = new FileStore();

    this._fileStore.addEventListener('error', (event) => {
      console.log(`Recipient: Got error in file store: ${event.data}`);
    });

    this._fileStore.addEventListener('open', () => {
      // be ready to receive data only when the file store is ready

      // open a peer connection with the dropper
      this._peer = new Peer(id);

      // on data channel negotiated
      this._peer.addEventListener('datachannel', (event) => {
        const dataChannel = event.channel;

        // make sure received messages are ArrayBuffers
        dataChannel.binaryType = 'arraybuffer';

        // add event listeners
        dataChannel.addEventListener(
          'message',
          this._onDataChannelMessage.bind(this)
        );
        dataChannel.addEventListener('open', () => {
          console.log(
            `Recipient: Data channel opened with label ${dataChannel.label}
          `);
        });
        dataChannel.addEventListener('close', () => {
          console.log(
            `Recipient: Data channel closed with label ${dataChannel.label}
          `);
        });

        // dataChannel will persist as it has event listeners attached to it
      });

      // on WebRTC peer connected disconnected
      this._peer.addEventListener('disconnected', () => {
        console.log('Recipient: Disconnected');
        // data channels should die; verify this?
      });
    });
  }

  _onDataChannelMessage(event) {
    try {
      if (typeof event.data === 'string') {
        // receive the message, providing the label and data
        this._receiveTextMessage(event.target.label, event.data);
      } else if (event.data instanceof ArrayBuffer) {
        this._receiveArrayBuffer(event.target.label, event.data);
      } else {
        throw new Error('Unexpected message');
      }
    } catch (err) {
      console.log(
        `Recipient: Got error in _onDataChannelMessage: ${err.toString()}`
      );
    }
  }

  async _download(label) {
    // get the file
    let file = await this._fileStore.getFile(
      label,
      this._fileinfo[label].size,
      this._fileinfo[label].type
    );

    // create download link for file
    const href = URL.createObjectURL(file);

    file = null; // garbage

    // dispatch event with download information
    this.dispatchEvent(
      new MessageEvent('download', { data: { href, ...this._fileinfo[label] } })
    );
  }

  async _receiveTextMessage(label, data) {
    // text messages should be JSON; attempt tp parse it
    const message = JSON.parse(data);

    switch (message.type) {
      case 'fileinfo':
        this._fileinfo[label] = message.fileinfo;

        this.dispatchEvent(
          new MessageEvent('fileinfo', { data: message.fileinfo })
        );

        // next blobs should wait before adding to the database
        this._request[label] = { readyState: 'pending' };

        // clear the file if it exists
        await this._fileStore.clearFile(label, message.fileinfo.size);

        // next blobs can be added to the database
        this._request[label] = { readyState: 'done' };

        break;

      case 'done':
        this._dataChannel.send('{"type":"received"}');

        // close everything; drop is complete

        this._dataChannel.close();
        this._dataChannel = null;

        this._peer.close();
        this._peer = null;

        if (this._request.readyState === 'pending') {
          try {
            // wait for this pending request to finish
            await new Promise((resolve, reject) => {
              this._request.addEventListener('success', resolve);
              this._request.addEventListener('error', reject);
            });
          } catch (err) {
            console.log(
              `Recipient: Got error when wrapping up: ${err.toString()}`
            );
          }
        }

        if (this._blob !== null) {
          // add this blob to the file store
          this._addBlobToFileStore();

          try {
            // wait until finished
            await new Promise((resolve, reject) => {
              this._request.addEventListener('success', resolve);
              this._request.addEventListener('error', reject);
            });
          } catch (err) {
            console.log(
              `Recipient: Got error when wrapping up: ${err.toString()}`
            );
          }
        }

        // start download; will dispatch 'download' event when ready
        this._download();

        break;
    }
  }

  _receiveArrayBuffer(label, buffer) {
    if (this._blob[label]) {
      this._blob[label] = new Blob(
        [this._blob[label], buffer],
        { type: this._fileinfo[label].type }
      );
    } else {
      this._blob[label] = new Blob(
        [buffer],
        { type: this._fileinfo[label].type }
      );
    }

    let request = this._request[label];

    if (request && request.readyState === 'done') {
      // start a new database request adding this blob to the file store
      request = this._fileStore.addBlob(
        label,
        this._offset[label],
        this._blob[label]
      );

      request.addEventListener('error', (event) => {
        console.log(
          `Recipient: Got error in _addBlobToFileStore: ${event.target.error.toString()}`
        );
      });

      // update the current request for this label to be this one
      this._request[label] = request;

      // update the offset for this file
      this._offset[label] += blob.size;
      this._blob[label] = null; // clear

      // dispatch offset changed event
      this.dispatchEvent(new MessageEvent('offsetchanged', {
        data: { label, offset: this._offset[label] }
      }));
    }
  }
}
