// Dropper.js

import { Peer } from './Peer.js';



const MESSAGE_SIZE = 16384;



/**
 * dispatches error, connected, disconnected, done
 * @extends EventTarget
 */
export class Dropper extends EventTarget {



  _peer = null;
  file = null; // the file being sent
  bytesSent = 0; // the number of bytes sent so far
  error = null;



  /**
   * @param {File} file - the file to drop
   */
  constructor(file) {
    super();

    // start dropping the file
    this._dropFile(file);
  }



  /**
   * @param {File} file 
   */
  async _dropFile(file) {
    try {
      this._peer = new Peer(true);

      // for UI informative purposes; peer will handle reconnection internally
      this._peer.addEventListener('error', (event) => {
        this.error = new Error('peer error', { cause: event.target.error });
        this.dispatchEvent(new Event('error'));
      });
      this._peer.addEventListener('connected', () => this.dispatchEvent(new Event('connected')));
      this._peer.addEventListener('disconnected', () => this.dispatchEvent(new Event('disconnected')));

      while (this.bytesSent < file.size) {
        // slice the file given the current offset
        const end = Math.min(this.bytesSent + MESSAGE_SIZE, file.size);
        const blob = file.slice(this.bytesSent, end); // get blob from file at offset

        // send blob to peer
        await this._peer.send(blob);
        this.bytesSent = end; // update offset for next loop
      }

      // TODO: listen for Peer._dataChannel bufferedamountlow event before closing
      await new Promise((resolve) => {
        setTimeout(resolve, 5000); // 5 seconds
      });
      this._peer.close();
      this.dispatchEvent(new Event('done'));
    } catch (err) {
      this._peer?.close();
      this._peer = null;
      this.error = err;
      this.dispatchEvent(new Event('error'));
    }
  }
}
