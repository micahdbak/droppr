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
  _dataChannel = null; // the data channel

  _fileinfo = {}; // the information about the file being received

  _fileStore = null; // the file store
  _request = null; // a file store request
  _blob = null; // the current blob
  _offset = 0; // the current offset

  // constructor

  constructor(id) {
    super();

    // open a peer connection with the dropper
    this._peer = new Peer(id);

    // on data channel negotiated
    this._peer.addEventListener('datachannel', (event) => {
      this._dataChannel = event.channel;
      this._dataChannel.binaryType = 'arraybuffer';
      this._dataChannel.addEventListener(
        'message',
        this._onDataChannelMessage.bind(this)
      );
    });

    // on WebRTC peer connected disconnected
    this._peer.addEventListener('disconnected', () => {
      // old data channel is dead; wait for renegotiation
      this._dataChannel = null;
    });

    // open the file store database
    this._fileStore = new FileStore();

    this._fileStore.addEventListener('error', (event) => {
      console.log(`Recipient: Got error in file store: ${event.data}`);
    });

    // on file store opened
    this._fileStore.addEventListener('open', () => {
      this._request = { readyState: 'pending' };
    });
  }

  async _clearFile() {
    await this._fileStore.clearFile(this._fileinfo.name, this._fileinfo.size);

    // ready for blobs
    this._request = { readyState: 'done' };
  }

  _addBlobToFileStore() {
    // add the current blob to the file store
    this._request = this._fileStore.addBlob(
      this._fileinfo.name,
      this._offset,
      this._blob
    );

    this._request.addEventListener('error', (event) => {
      console.log(
        `Recipient: Got error in _addBlobToFileStore: ${event.target.error.toString()}`
      );
    });

    // update offset and blob
    this._offset += this._blob.size;
    this._blob = null;

    this.dispatchEvent(new MessageEvent('bytes', { data: this._offset }));
  }

  async _download() {
    // get the file
    let file = await this._fileStore.getFile(
      this._fileinfo.name,
      this._fileinfo.size,
      this._fileinfo.type
    );
    this._fileStore.close(); // close the file store

    // create download link for file
    const href = URL.createObjectURL(file);

    file = null; // garbage

    // dispatch event with download information
    this.dispatchEvent(
      new MessageEvent('download', { data: { href, ...this._fileinfo } })
    );
  }

  async _onDataChannelMessage(event) {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);

      switch (message.type) {
        case 'fileinfo':
          this._fileinfo = message.fileinfo;

          this.dispatchEvent(
            new MessageEvent('fileinfo', { data: message.fileinfo })
          );

          // file store is waiting for us to consider the file info
          if (this._request !== null) {
            this._clearFile();
          } else {
            this._fileStore.addEventListener(
              'open',
              this._clearFile.bind(this)
            );
          }

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
    } else if (event.data instanceof ArrayBuffer) {
      if (this._blob !== null) {
        // append the message to the existing blob
        this._blob = new Blob([this._blob, event.data]);
      } else {
        // create a new blob with the message
        this._blob = new Blob([event.data]);
      }

      // check if the last request is done
      if (this._request !== null && this._request.readyState === 'done') {
        this._addBlobToFileStore();
      }
    } else {
      console.log(`Recipient: Got unexpected data: ${event.data}`);
    }
  }
}
