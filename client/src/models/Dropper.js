// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Dropper.js

import { Peer } from './index.js';

const _blobSize = parseInt(process.env.REACT_APP_BLOB_SIZE, 10);

/* Dropper - Drop a file.
 *
 * public methods:
 *
 * constructor(file) - Start a drop for a given file.
 *   file: the file to drop
 *
 * dispatches events:
 *
 * 'registered' -> MessageEvent (event.data has the drop identifier.)
 * - The drop was registered, and a drop identifier was given.
 *
 * 'open' -> Event
 * - The connection is open. Data is now flowing.
 *
 * 'close' -> Event
 * - The connection was closed. Will reconnect if drop isn't complete.
 *
 * 'bytes' -> MessageEvent (event.data has bytes sent.)
 * - An update on the number of bytes sent.
 *
 * 'done' -> Event
 * - The file was dropped successfully.
 */
export class Dropper extends EventTarget {
  // private fields

  _peer = null; // the peer connection
  _dataChannel = null; // the data channel
  _file = null; // the file to be sent
  _state = 'fileinfo'; // the current state
  _start = 0; // the position in the file

  // constructor

  constructor(file) {
    super();

    // initialize things
    this._peer = new Peer();
    this._dataChannel = this._peer.createDataChannel('droppr');
    this._file = file;

    // dispatch registered event when it happens
    this._peer.addEventListener('registered', (event) => {
      this.dispatchEvent(new MessageEvent('registered', { data: event.data }));
    });

    // event listeners for data channel
    this._dataChannel.addEventListener(
      'message',
      this._onDataChannelMessage.bind(this)
    );
    this._dataChannel.addEventListener('open', this._nextMessage.bind(this));
    this._dataChannel.addEventListener(
      'bufferedamountlow',
      this._nextMessage.bind(this)
    );

    // for notification purposes
    this._dataChannel.addEventListener(
      'open',
      this._onDataChannelOpen.bind(this)
    );
    this._dataChannel.addEventListener(
      'close',
      this._onDataChannelClose.bind(this)
    );
  }

  // private methods

  _onDataChannelMessage(event) {
    try {
      const message = JSON.parse(event.data);

      if (message.type === 'received') {
        // close the data channel
        this._dataChannel.close();
        this._dataChannel = null;

        // close the WebRTC peer connection
        this._peer.close();
        this._peer = null;

        // dispatch 'done' event
        this.dispatchEvent(new Event('done'));
      } else {
        // unexpected message; log it
        console.log(
          `Dropper: Message in Dropper._onDataChannelMessage: ${event.data}`
        );
      }
    } catch (err) {
      console.log(
        `Dropper: Error in Dropper._onDataChannelMessage: ${err.toString()}`
      );
    }
  }

  async _nextMessage() {
    try {
      switch (this._state) {
        // ready to send next chunk
        case 'send':
          // check if done sending file
          if (this._start >= this._file.size) {
            this._dataChannel.send('{"type":"done"}');
            this._state = 'done';
          }

          // incase an event follows the 'await' below, don't send
          // (preserve the proper ordering of array buffers)
          this._state = 'sending';

          // slice the file given the current position
          let end = Math.min(this._start + _blobSize, this._file.size);
          let blob = this._file.slice(this._start, end);

          // update the current position
          this._start = end;

          // get buffer and send it through the data channel
          // NOTE: this._dataChannel will dispatch bufferedamountlow when done
          let buffer = await blob.arrayBuffer();
          this._dataChannel.send(buffer);

          // dispatch byte count update
          this.dispatchEvent(new MessageEvent('bytes', { data: this._start }));

          // next event should send
          this._state = 'send';

          // take out the trash
          buffer = null;
          blob = null;

          break;

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

        // 'sending', 'done'
        default:
          // pass
          console.log(
            `Dropper: Passing state '${this._state}' in Droppr._nextMessage.`
          );

          break;
      }
    } catch (err) {
      console.log(`Dropper: Error in Dropper._nextMessage: ${err.toString()}`);
    }
  }

  _onDataChannelOpen() {
    this.dispatchEvent(new Event('open'));
  }

  _onDataChannelClose() {
    this.dispatchEvent(new Event('close'));
  }
}
