// FileStream.js

import * as uuid from 'uuid';

const _messageSize = parseInt(process.env.REACT_APP_MESSAGE_SIZE, 10);

/* FileStream - Send a file through a data channel.
 *
 * public methods:
 *
 * constructor(peer, file) - Open a data channel for a given file
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
    _state = 'fileinfo'; // the current state
  
    // public fields
  
    file; // the file to be sent
    label; // the data channel label
    offset = 0; // the current position in the file
  
    // constructor
  
    constructor(peer, file) {
      super();
  
      // generate a unique UUID for this file
      this.label = uuid.v4();
  
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
        switch (this._state) {
          // send file information to the recipient
          case 'fileinfo':
            const packet = {
              type: 'fileinfo',
              fileinfo: {
                name: this.file.name,
                size: this.file.size,
                type: this.file.type
              }
            };
  
            this._dataChannel.send(JSON.stringify(packet));
            this._state = 'send';
  
            break;
  
          // ready to send next chunk
          case 'send':
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
  
            break;
  
          // 'sending', 'done', ...
          default:
            console.log(
              `FileStream: Passing state '${this._state}' in _sendMessage.`
            );
  
            // pass
  
            break;
        }
      } catch (err) {
        console.log(`FileStream: Error in _sendMessage: ${err.toString()}`);
      }
    }
  }