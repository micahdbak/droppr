// Receiver.js

import { Peer } from './Peer.js';
import { FileStore } from './FileStore.js'

/* Receiver - Receive files
 *
 * public methods:
 *
 * constructor() - Receive files
 * close()       - Close connection
 *
 * public fields:
 *
 * fileinfo      - File information
 * download      - Download information
 * totalSize     - Total size of files being received
 * bytesReceived - Number of bytes received
 *
 * dispatches events:
 *
 * connected       -> Event
 * disconnected    -> Event
 * fileinfochanged -> Event
 * downloadchanged -> Event
 * done            -> Event
 */
export class Receiver extends EventTarget {
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

  constructor() {
    super();

    // open the file store database
    this._fileStore = new FileStore();
    this._fileStore.addEventListener('error', (event) => {
      console.log('Recipient: Error in this._fileStore: ' + event.target.error.toString());
    });
    this._fileStore.addEventListener('blocked', () => {
      console.log('Recipient: Blocked from opening database.');
    });
    this._fileStore.addEventListener('open', this._openPeer.bind(this));
  }

  _openPeer() {
    // open a peer connection with the dropper
    this._peer = new Peer(false);
    this._peer.addEventListener('connected', () => {
      this.dispatchEvent(new Event('connected'));
    });
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });

    // on the opening of a datachannel by the peer
    this._peer.addEventListener('datachannel', (event) => {
      const dataChannel = event.channel;
      dataChannel.binaryType = 'arraybuffer'; // make sure received messages are ArrayBuffers
      dataChannel.addEventListener('message', this._onDataChannelMessage.bind(this));
    });
  }

  _onDataChannelMessage(event) {
    try {
      if (typeof event.data === 'string') {
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
    // text messages should be JSON; attempt to parse it
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
            console.log(`Recipient: Error in _receiveTextMessage for pending request: ${err.toString()}`);
          }
        }

        delete this._request[label];

        // check if there is a blob waiting to be added to the file store
        if (this._blob[label] !== null) {
          // start a new request adding this blob to the file store
          const request = this._fileStore.add(label, this._offset[label], this._blob[label]);

          try {
            // wait for this request to finish
            await new Promise((resolve, reject) => {
              request.addEventListener('success', resolve);
              request.addEventListener('error', reject);
            });
          } catch (err) {
            console.log(`Recipient: Error in _receiveTextMessage for pending blob: ${err.toString()}`);
          }
        }

        delete this._blob[label];

        // flush the file from the object store
        let file = await this._fileStore.flush(label, this._fileinfo[label].size, this._fileinfo[label].type);

        // create download link for file
        const href = URL.createObjectURL(file);

        this._download[label] = { ...this._fileinfo[label], href };
        this.dispatchEvent(new Event('downloadchanged'));

        // this.bytesReceived will now count using this._download
        delete this._offset[label];

        delete this._fileinfo[label]; // remove the fileinfo for this channel
        this.dispatchEvent(new Event('fileinfochanged'));

        delete this._offset[label];
        // all references for this channel should be deleted
        // (wahoo; garbage collected???)

        // dispatch done event when no more fileinfos
        if (Object.values(this._fileinfo).length === 0) {
          this.dispatchEvent(new Event('done'));
          this.close();
        }

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
      this._blob[label] = new Blob([this._blob[label], event.data], { type: this._fileinfo[label].type });
    } else {
      // create new blob with just the incoming data
      this._blob[label] = new Blob([event.data], { type: this._fileinfo[label].type });
    }

    let request = this._request[label];

    // check if previous DB request is done
    if (request.readyState === 'done') {
      // start a new database request adding this blob to the file store
      request = this._fileStore.add(label, this._offset[label], this._blob[label]);
      request.addEventListener('error', (event) => {
        console.log('Recipient: Error in _receiveArrayBuffer: ' + event.target.error.toString());

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

  // getters

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

  // public methods

  close() {
    try {
      this._peer.close();
      this._fileStore.close();
    } catch (err) {
      // pass
    }
  }
}
