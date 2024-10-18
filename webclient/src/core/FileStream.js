// FileStream.js

import * as uuid from 'uuid';

const _messageSize = parseInt(process.env.REACT_APP_MESSAGE_SIZE, 10);

/* FileStream - Send a file through a data channel.
 *
 * public methods:
 *
 * constructor(peer, file, label) - Open a data channel for a given file
 *
 * public fields:
 *
 * file   - The file being sent
 * label  - The data channel label
 * offset - Current position in file (bytes)
 *
 * dispatches events:
 *
 * done -> Event
 */
export class FileStream extends EventTarget {
    // private fields
  
    _dataChannel = null; // the data channel
    _state = 'send'; // the current state
  
    // public fields
  
    file; // the file to be sent
    label; // the data channel label
    offset = 0; // the current position in the file
  
    // constructor
  
    constructor(peer, file, label) {
      super();
  
      // generate a unique UUID for this file
      this.label = label;
  
      this._dataChannel = peer.createDataChannel(this.label);
      this.file = file;
  
      // event listeners for data channel
      this._dataChannel.addEventListener('open', this._sendMessage.bind(this));
      this._dataChannel.addEventListener(
        'bufferedamountlow',
        this._sendMessage.bind(this)
      );
    }
  
    // private methods
  
    async _sendMessage() {
      try {
        if (this._state === 'send') {
          // check if done sending file
          if (this.offset >= this.file.size) {
            this._dataChannel.send('{"type":"done"}'); // send done message
            // let recipient close the connection

            // set state to done
            this._state = 'done';
            this.dispatchEvent(new Event('done'));

            return;
          }

          // slice the file given the current position
          let end = Math.min(this.offset + _messageSize, this.file.size);
          let blob = this.file.slice(this.offset, end);

          // update the current position
          this.offset = end;

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
            `FileStream: Passing state '${this._state}' in _sendMessage.`
          );
        }
      } catch (err) {
        console.log(`FileStream: Error in _sendMessage: ${err.toString()}`);
      }
    }
  }