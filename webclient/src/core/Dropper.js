// Dropper.js

import { Peer } from './Peer.js';
import { FileStream } from './FileStream.js';

/* Dropper - send files
 *
 * public methods:
 *
 * constructor(files) - start a drop for files
 * close()            - Close connection
 *
 * public fields:
 *
 * fileinfo - Information about files being sent
 * totalSize - Sum of file sizes
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

  // public fields

  fileinfo = []; // information about the files being dropped
  totalSize = 0; // total size of files

  // constructor

  constructor(files) {
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
      const fileStream = new FileStream(this._peer, files[i]);
      this._fileStreams.push(fileStream);

      this.fileinfo.push({
        name: files[i].name,
        size: files[i].size,
        type: files[i].type
      });
      this.totalSize += files[i].size;
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
