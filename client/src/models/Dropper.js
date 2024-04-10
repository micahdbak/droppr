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
 * constructor(peer, file) - Start a drop for a given file.
 *   peer: the peer connection to facilitate the drop
 *   file: the file to drop
 *
 * public fields:
 *
 * label - The data channel label
 *
 * offset - Current position in file (bytes)
 *
 * dispatches events:
 *
 * 'done' -> Event
 * - The file was sent successfully.
 */
class FileStream extends EventTarget {
  // private fields

  _dataChannel = null; // the data channel
  _file = null; // the file to be sent
  _state = 'fileinfo'; // the current state

  // public fields

  label; // the data channel label
  offset = 0; // the current position in the file

  // constructor

  constructor(peer, file) {
    super();

    // generate a unique UUID for this file
    this.label = uuid.v4();

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
          if (this.offset >= this._file.size) {
            this._dataChannel.send('{"type":"done"}'); // send done message
            // let recipient close the connection

            // set state to done
            this._state = 'done';

            return;
          }

          // incase an event follows the 'await' below, don't send
          // (preserve the proper ordering of array buffers)
          this._state = 'sending';

          // slice the file given the current position
          let end = Math.min(this.offset + _messageSize, this._file.size);
          let blob = this._file.slice(this.offset, end);

          // update the current position
          this.offset = end;

          // get buffer and send it through the data channel
          // NOTE: this._dataChannel will dispatch bufferedamountlow when done
          let buffer = await blob.arrayBuffer();
          this._dataChannel.send(buffer);

          // next event should send
          this._state = 'send';

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

/* Dropper - Send files.
 *
 * public methods:
 *
 * constructor(files) - Register and start a drop for files.
 *   files: array of files to drop
 *
 * public fields:
 *
 * fileinfo
 *
 * dispatches events:
 *
 * 'registered' -> MessageEvent (event.data has the drop identifier.)
 * - The drop was registered, and a drop identifier was given.
 *
 * 'connected' -> Event
 * - The recipient has connected.
 *
 * 'disconnected' -> Event
 * - The recipient has disconnected, intentionally or unintentionally.
 *   If unintentional, reconnection will be attempted immediately.
 *
 * 'offsetchanged' -> MessageEvent (event.data has attributes label, offset.)
 * - Offset changed; an update on the number of bytes sent for a given file.
 *
 * 'failed' -> Event
 * - An unexpected error has prevented the files from being dropped.
 *
 * 'done' -> Event
 * - The file was dropped successfully.
 */
export class Dropper extends EventTarget {
  // private fields

  _peer = null; // the peer connection
  _fileStreams = []; // open file streams

  // public fields

  fileinfo = {}; // information about the files being dropped

  // constructor

  constructor(files) {
    super();

    // initialize things
    this._peer = new Peer();

    // start file streams (data channels) for each file
    for (let i = 0; i < files.length; i++) {
      const fileStream = new FileStream(this._peer, files[i]);

      this.fileinfo[fileStream.label] = {
        name: files[i].name,
        size: files[i].size,
        type: files[i].type
      };

      this._fileStreams.push(fileStream);
    }

    // on registered
    this._peer.addEventListener('registered', (event) => {
      this.dispatchEvent(new MessageEvent('registered', { data: event.data }));
    });

    // on peer connected
    this._peer.addEventListener('connected', () => {
      this.dispatchEvent(new Event('connected'));
    });

    // on peer disconnected
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });

    // watch file streams, and, when finished
    this._awaitFileStreams();

    this._interval = setInterval(() => {
      this.dispatchEvent(new MessageEvent('offsetchanged',
        { data: this._fileStreams.map((fileStream) => fileStream.offset) }
      ));
    }, 1000); // every second
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

      // dispatch complete event
      this.dispatchEvent(new Event('done'));
    } catch (err) {
      console.log(`Dropper: Error in _awaitFileStreams: ${err.toString()}`);
      this.dispatchEvent(new Event('failed'));
    }
  }
}
