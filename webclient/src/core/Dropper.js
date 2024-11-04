// Dropper.js

import { Peer } from './Peer.js';

const _messageSize = parseInt(process.env.REACT_APP_MESSAGE_SIZE, 10);

/* Dropper - send files
 *
 * public methods:
 *
 * constructor(file) - start a drop for the provided file
 * close()           - Close connection
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

  _peer = null; // the peer connection
  _dataChannel = null; // the data channel
  _state = 'send'; // the current state

  // public fields

  file = null; // the file being sent
  bytesSent = 0;
  error = new Error("huh?");

  // constructor

  constructor(file) {
    super();

    this.file = file;

    // start waiting for peer connection
    this._peer = new Peer(true);
    this._peer.addEventListener('connected', () => {
      this.dispatchEvent(new Event('connected'));
    });
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });

    // create data channel to stream the file
    this._dataChannel = this._peer.createDataChannel('filestream');
    this._dataChannel.addEventListener('open', this._sendMessage.bind(this));
    this._dataChannel.addEventListener('bufferedamountlow', this._sendMessage.bind(this));
  }

  // private methods

  async _sendMessage() {
    try {
      if (this._state === 'send') {
        // check if done sending file
        if (this.bytesSent >= this.file.size) {
          this._dataChannel.send('done'); // send done message

          // set state to done
          this._state = 'done';
          this.dispatchEvent(new Event('done'));

          // close peer connection
          this.close();
          return;
        }

        // slice the file given the current position
        let end = Math.min(this.bytesSent + _messageSize, this.file.size);
        let blob = this.file.slice(this.bytesSent, end);

        // update the current position
        this.bytesSent = end;

        // get buffer and send it through the data channel
        // NOTE: this._dataChannel will dispatch bufferedamountlow when done
        this._state = 'sending'; // incase an event follows the 'await' below, don't send
        let buffer = await blob.arrayBuffer();
        this._state = 'send'; // next event should send
        
        // queue the message
        this._dataChannel.send(buffer);

        // take out the trash
        buffer = null;
        blob = null;
      } else {
        console.log(
          `Dropper: Passing state '${this._state}' in _sendMessage.`
        );
      }
    } catch (err) {
      console.log(`Dropper: Error in _sendMessage: ${err.toString()}`);
    }
  }

  // public methods

  close() {
    this._peer.close();
  }
}
