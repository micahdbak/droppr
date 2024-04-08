// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Dropper.js

import * as uuid from 'uuid';

import { Peer } from './index.js';

const _messageSize = parseInt(process.env.REACT_APP_MESSAGE_SIZE, 10);

/* FileStream - Send a file through a data channel.
 *
 * public methods:
 *
 * constructor(file) - Start a drop for a given file.
 *   file: the file to drop
 *
 * dispatches events:
 *
 * 'offsetchanged' -> MessageEvent (event.data has the new offset.)
 * - The file offset has changed; a message was just sent.
 *
 * 'done' -> Event
 * - The file was sent successfully.
 */
export class FileStream extends EventTarget {
  // private fields

  _dataChannel = null; // the data channel
  _file = null; // the file to be sent
  _offset = 0; // the current position in the file
  _state = 'fileinfo'; // the current state

  // public fields

  label;

  // constructor

  constructor(peer, file) {
    super();

    // initialize things
    this.label = uuid.v4(); // generate a UUID for this file
    this._dataChannel = peer.createDataChannel(this.label);
    this._file = file;

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
              name: this._file.name,
              size: this._file.size,
              type: this._file.type
            }
          };

          this._dataChannel.send(JSON.stringify(packet));
          this._state = 'send';

          break;

        // ready to send next chunk
        case 'send':
          // check if done sending file
          if (this._offset >= this._file.size) {
            this._dataChannel.send('{"type":"done"}'); // send done message
            this._dataChannel.close(); // this channel can be closed now

            // set state to done
            this._state = 'done';
          }

          // incase an event follows the 'await' below, don't send
          // (preserve the proper ordering of array buffers)
          this._state = 'sending';

          // slice the file given the current position
          let end = Math.min(this._offset + _messageSize, this._file.size);
          let blob = this._file.slice(this._offset, end);

          // update the current position
          this._offset = end;

          // get buffer and send it through the data channel
          // NOTE: this._dataChannel will dispatch bufferedamountlow when done
          let buffer = await blob.arrayBuffer();
          this._dataChannel.send(buffer);

          // dispatch byte count update
          this.dispatchEvent(
            new MessageEvent('offsetchanged', { data: this._offset })
          );

          // next event should send
          this._state = 'send';

          // take out the trash
          buffer = null;
          blob = null;

          break;

        // 'sending', 'done', ...
        default:
          console.log(
            `FileStream: Passing state '${this._state}' in Droppr._sendMessage.`
          );

          // pass

          break;
      }
    } catch (err) {
      console.log(`FileStream: Error in FileStream._sendMessage: ${err.toString()}`);
    }
  }
}
