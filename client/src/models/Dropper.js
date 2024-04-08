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
 * dispatches events:
 *
 * 'registered' -> MessageEvent (event.data has the drop identifier.)
 * - The drop was registered, and a drop identifier was given.
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

  fileinfo = []; // information about the files being dropped

  // constructor

  constructor(files) {
    super();

    // initialize things
    this._peer = new Peer();

    // start file streams (data channels) for each file
    for (let i = 0; i < files.length; i++) {
      const fileStream = new FileStream(this._peer, files[i]);

      fileStream.addEventListener('offsetchanged', (event) => {
        // dispatch offsetchanged event providing file label and the new offset
        this.dispatchEvent(new MessageEvent('offsetchanged', {
          data: {
            label: event.target.label,
            offset: event.data
          }
        }));
      });

      this.fileinfo.push({
        name: files[i].name,
        size: files[i].size,
        type: files[i].type,
        label: fileStream.label
      });

      this._fileStreams.push(fileStream);
    }

    // dispatch registered event when it happens
    this._peer.addEventListener('registered', (event) => {
      this.dispatchEvent(new MessageEvent('registered', { data: event.data }));
    });

    // watch file streams, and, when finished
    this._awaitFileStreams();
  }

  // private methods

  async _awaitFileStreams() {
    try {
      // create a promise for each stream that resolves when each file is sent
      const promises = this._fileStreams.map(fileStream => {
        return new Promise((resolve, reject) => {
          fileStream.addEventListener('done', resolve);
        });
      });

      await Promise.all(promises);

      // dispatch complete event
      this.dispatchEvent(new Event('done'));
    } catch (err) {
      console.log(`Dropper: Got error while waiting for file streams: ${err.toString()}`);
      this.dispatchEvent(new Event('failed'));
    }
  }
}
