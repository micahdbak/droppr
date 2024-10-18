// Dropper.js

import { Peer } from './Peer.js';
import { FileStream } from './FileStream.js';

/* Dropper - send files
 *
 * public methods:
 *
 * constructor(files, labels) - start a drop for files
 * close()                    - Close connection
 *
 * public fields:
 *
 * bytesSent - Total number of bytes sent
 *
 * dispatches events:
 *
 * connected    -> Event
 * disconnected -> Event
 * failed       -> Event
 * done         -> Event
 */
export class Dropper extends EventTarget {
  // private fields

  _peer; // the peer connection
  _fileStreams = []; // open file streams

  // constructor

  constructor(files, labels) {
    super();

    // start waiting for peer connection
    this._peer = new Peer(true);
    this._peer.addEventListener('connected', () => {
      this.dispatchEvent(new Event('connected'));
    });
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });

    // start file streams (data channels) for each file
    for (let i = 0; i < files.length; i++) {
      const fileStream = new FileStream(this._peer, files[i], labels[i]);
      this._fileStreams.push(fileStream);
    }

    // watch file streams
    this._awaitFileStreams();
  }

  // private methods

  async _awaitFileStreams() {
    try {
      // create a promise for each stream that resolves when each file is sent
      const promises = this._fileStreams.map((fileStream) => {
        return new Promise((resolve, reject) => {
          fileStream.addEventListener('done', resolve);
        });
      });

      await Promise.all(promises);
      this.dispatchEvent(new Event('done'));
      this.close();
    } catch (err) {
      console.log(`Dropper: Error in _awaitFileStreams: ${err.toString()}`);
      this.dispatchEvent(new Event('failed'));
    }
  }

  // getters

  get bytesSent() {
    let bytesSent = 0;

    for (let i = 0; i < this._fileStreams.length; i++) {
      bytesSent += this._fileStreams[i].offset;
    }

    return bytesSent;
  }

  // public methods

  close() {
    this._peer.close();
  }
}
