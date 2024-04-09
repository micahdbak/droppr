// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// Dropper.js

import { Peer, FileStream } from './index.js';

const _messageSize = parseInt(process.env.REACT_APP_MESSAGE_SIZE, 10);

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

      fileStream.addEventListener('offsetchanged', (event) => {
        this.dispatchEvent(new MessageEvent('offsetchanged', {
          data: { label: fileStream.label, offset: event.data }
        }));
      });

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
