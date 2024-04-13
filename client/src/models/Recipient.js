// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Recipient.js

import { Peer } from './Peer.js';

// increase this when updating the db schema
const _databaseVersion = 3;

/* FileStore - Use IndexedDB to store and get files
 *
 * public methods:
 *
 * constructor() - Open the database.
 *
 * add(label, offset, blob)
 * - add blob for a file
 *
 * flush(label)
 * - get a combined blob for a given label
 *
 * close()
 * - close the database connection
 *
 * dispatches events:
 *
 * 'error' -> Event (event.target.error has the error)
 * - The database encountered an error when opening.
 *
 * 'blocked' -> Event
 * - The database was blocked from opening.
 *
 * 'open' -> Event
 * - The database is opened and ready.
 */
class FileStore extends EventTarget {
  // private fields

  _database; // the database

  // public fields

  error;

  // constructor

  constructor() {
    super();

    const openRequest = window.indexedDB.open('fileStore', _databaseVersion);

    openRequest.addEventListener('error', (event) => {
      this.error = event.target.error;
      this.dispatchEvent(new Event('error'));
    });

    openRequest.addEventListener('blocked', (event) => {
      this.dispatchEvent(new Event('blocked'));
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      // delete the blobs object store if it exists
      if (event.target.result.objectStoreNames.contains('blobs')) {
        console.log('FileStore: Deleting blobs object store');
        event.target.result.deleteObjectStore('blobs');
      }

      // object store for blobs with label and offset as keys
      event.target.result.createObjectStore('blobs', {
        keyPath: ['label', 'offset']
      });
    });

    openRequest.addEventListener('success', (event) => {
      this._database = event.target.result;
      this.dispatchEvent(new Event('open'));
      this._openRequest = null;
    });
  }

  // public methods

  // add blob data for a file
  add(label, offset, blob) {
    // return the IDBRequest for this transaction
    return this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs')
      .add({ label, offset, blob });
  }

  // get a combined blob for a given label
  async flush(label, size, type) {
    // start a read-only transaction on the blobs object store
    const transaction = this._database.transaction(['blobs'], 'readwrite');
    const blobs = transaction.objectStore('blobs');

    let combinedBlob = null;

    // get an offset range for each item in the object store for this file
    const offsetRange = IDBKeyRange.bound([label, 0], [label, size]);

    // start a cursor request given the offset range
    const cursorRequest = blobs.openCursor(offsetRange);

    // at each offset
    cursorRequest.addEventListener('success', (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const blob = cursor.value.blob;
        const offset = cursor.key[1];

        if (combinedBlob === null) {
          combinedBlob = new Blob([blob], { type });
        } else {
          combinedBlob = new Blob([combinedBlob, blob], { type });
        }

        // NOTE: could do this to delete the item, but this may force
        // each blob into memory (as its being removed from disk).
        // PERKS: can keep a local history of files and re-download them.
        // FUTURE FEATURE: interactive history of files page, with downloads
        // REQUIRES: file information be stored in the indexedDB as well as
        // blobs.
        //cursor.delete();
        cursor.continue(); // continue to the next item
      }
    });

    // wait for the transaction to complete
    await new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', reject);
    });

    return combinedBlob;
  }

  close() {
    if (this._database !== null) {
      this._database.close();
      this._database = null;
    }
  }
}

/* Recipient - Receive a file
 *
 * public methods:
 *
 * constructor(id) - Receive a file given a drop identifier.
 *   id: the drop identifier
 *
 * public fields:
 *
 * fileinfo - File information
 *
 * download - Download information
 *
 * totalSize - Total size of files being received
 *
 * bytesReceived - Number of bytes received
 *
 * dispatches events:
 *
 * 'connected' -> Event
 * - The dropper has connected.
 *
 * 'disconnected' -> Event
 * - The dropper has disconnected, intentionally or unintentionally.
 *   If unintentional, reconnection will be attempted immediately.
 *
 * 'fileinfochanged' -> Event
 * - File information about a file that is being downloaded has changed. Access
 *   event.target.fileinfo for the changed fileinfo.
 *
 * 'downloadchanged' -> Event
 * - A file was downloaded successfully. Access event.target.download for the
 *   changed download information.
 */
export class Recipient extends EventTarget {
  // private fields

  _peer; // the peer connection
  _fileStore; // the file store

  // these all map a given data channel label to...
  _fileinfo = {}; // ...file information
  _blob = {}; // ...pending blob
  _offset = {}; // ...current offset
  _request = {}; // ...current database request
  _download = {}; // ...download information

  // constructor

  constructor(id) {
    super();

    this.id = id;

    // open the file store database
    this._fileStore = new FileStore();

    this._fileStore.addEventListener('error', (event) => {
      console.log(
        'Recipient: Error in this._fileStore: ' + event.target.error.toString()
      );
    });

    this._fileStore.addEventListener('blocked', () => {
      console.log('Recipient: Blocked from opening database.');
    });

    this._fileStore.addEventListener('open', this._openPeer.bind(this));
  }

  _openPeer() {
    // open a peer connection with the dropper
    this._peer = new Peer(this.id);

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
    });

    // on peer connected
    this._peer.addEventListener('connected', () => {
      this.dispatchEvent(new Event('connected'));
    });

    // on peer disconnected
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });
  }

  _onDataChannelMessage(event) {
    try {
      if (typeof event.data === 'string') {
        // receive the message, providing the label and data
        this._receiveTextMessage(event.target.label, event);
      } else if (event.data instanceof ArrayBuffer) {
        this._receiveArrayBuffer(event.target.label, event);
      } else {
        throw new Error('Weird message');
      }
    } catch (err) {
      console.log(
        `Recipient: Error in _onDataChannelMessage: ${err.toString()}`
      );
    }
  }

  async _receiveTextMessage(label, event) {
    // text messages should be JSON; attempt tp parse it
    const message = JSON.parse(event.data);

    switch (message.type) {
      case 'fileinfo':
        this._fileinfo[label] = message.fileinfo;
        this.dispatchEvent(new Event('fileinfochanged'));

        // initialize these things
        this._blob[label] = null;
        this._offset[label] = 0;
        this._request[label] = { readyState: 'done' };

        break;

      case 'done':
        // close the data channel, since we got the done message
        event.target.close();

        console.log(`Recipient: Got done message for data channel ${label}`);

        // check if there is a pending file store request
        if (this._request[label].readyState === 'pending') {
          try {
            // wait for this pending request to finish
            await new Promise((resolve, reject) => {
              this._request[label].addEventListener('success', resolve);
              this._request[label].addEventListener('error', reject);
            });
          } catch (err) {
            console.log(
              `Recipient: Error in _receiveTextMessage for pending request: ${err.toString()}`
            );
          }
        }

        delete this._request[label];

        // check if there is a blob waiting to be added to the file store
        if (this._blob[label] !== null) {
          // start a new request adding this blob to the file store
          const request = this._fileStore.add(
            label,
            this._offset[label],
            this._blob[label]
          );

          try {
            // wait for this request to finish
            await new Promise((resolve, reject) => {
              request.addEventListener('success', resolve);
              request.addEventListener('error', reject);
            });
          } catch (err) {
            console.log(
              `Recipient: Error in _receiveTextMessage for pending blob: ${err.toString()}`
            );
          }
        }

        delete this._blob[label];
        delete this._offset[label];

        // flush the file from the object store
        let file = await this._fileStore.flush(
          label,
          this._fileinfo[label].size,
          this._fileinfo[label].type
        );

        // create download link for file
        const href = URL.createObjectURL(file);

        this._download[label] = { ...this._fileinfo[label], href };
        this.dispatchEvent(new Event('downloadchanged'));

        delete this._fileinfo[label]; // remove the fileinfo for this channel
        this.dispatchEvent(new Event('fileinfochanged'));

        // all references for this channel should be deleted
        // (wahoo; garbage collected???)

        break;

      default:
        console.log(`Recipient: Got unexpected message: ${event.data}`);

        // pass

        break;
    }
  }

  _receiveArrayBuffer(label, event) {
    if (this._blob[label] !== null) {
      // append the incoming data to the pending blob
      this._blob[label] = new Blob([this._blob[label], event.data], {
        type: this._fileinfo[label].type
      });
    } else {
      // create new blob with just the incoming data
      this._blob[label] = new Blob([event.data], {
        type: this._fileinfo[label].type
      });
    }

    let request = this._request[label];

    // check if previous DB request is done
    if (request.readyState === 'done') {
      // start a new database request adding this blob to the file store
      request = this._fileStore.add(
        label,
        this._offset[label],
        this._blob[label]
      );

      request.addEventListener('error', (event) => {
        console.log(
          'Recipient: Error in _receiveArrayBuffer: ' +
            event.target.error.toString()
        );

        // TODO: close the channel maybe? retry?
        // consider recovery methods in the event of a DB failure
      });

      // update the current request for this label to be this one
      this._request[label] = request;

      // update the offset for this file
      this._offset[label] += this._blob[label].size;
      this._blob[label] = null; // clear the blob
    }
  }

  // public methods

  get fileinfo() {
    return Object.values(this._fileinfo);
  }

  get download() {
    return Object.values(this._download);
  }

  get totalSize() {
    let totalSize = 0;

    const fileinfo = Object.values(this._fileinfo);

    for (let i = 0; i < fileinfo.length; i++) {
      totalSize += fileinfo[i].size;
    }

    const download = Object.values(this._download);

    for (let i = 0; i < download.length; i++) {
      totalSize += download[i].size;
    }

    return totalSize;
  }

  get bytesReceived() {
    let bytesReceived = 0;

    const offset = Object.values(this._offset);

    for (let i = 0; i < offset.length; i++) {
      bytesReceived += offset[i];
    }

    const download = Object.values(this._download);

    for (let i = 0; i < download.length; i++) {
      bytesReceived += download[i].size;
    }

    return bytesReceived;
  }
}
