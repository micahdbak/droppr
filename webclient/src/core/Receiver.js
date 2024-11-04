// Receiver.js

import { Peer } from './Peer.js';
import { FileStore } from './FileStore.js';



/**
 * @extends EventTarget
 */
export class Receiver extends EventTarget {



  /**
   * @private
   * @type {Peer}
   */
  _peer = null;

  /**
   * @private
   * @type {RTCDataChannel}
   */
  _dataChannel = null;

  /**
   * @private
   * @type {Blob}
   */
  _blob = new Blob([], { type: 'application/octet-stream' });

  /**
   * @private
   * @type {string}
   */
  _state = 'receive';

  /**
   * stream to write file for the File System Access API (only Chromium-based browsers)
   * @private
   * @type {WritableStream}
   */
  _writableStream = null; // stream to write file

  /**
   * IndexedDB helper class (for other browsers)
   * @private
   * @type {FileStore}
   */
  _fileStore = null;


  
  /**
   * @namespace
   * @property {string} name - file name
   * @property {number} size - file size
   * @property {string} type - file MIME type
   * @property {string} href - file download link
   */
  file = {
    name: 'tmp.bin',
    size: 0,
    type: 'application/octet-stream',
    href: ''
  }; // fake data to be overwritten

  /**
   * @type {number}
   */
  bytesReceived = 0;

  /**
   * Progress of processing file, from 0 to 100.
   * @type {number}
   */
  processingProgress = 0;

  /**
   * @type {Error}
   */
  error = new Error("huh?");



  /**
   * @param {File} file - information on the file to receive
   */
  constructor(file) {
    super(); // EventTarget

    this.file = file;

    if (window.showSaveFilePicker) {
      // Chromium-based browsers
      const awaitShowSaveFilePicker = async () => {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: this.file.name
        });
        this._writableStream = await fileHandle.createWritable();
    
        this._setupPeerConnection(this._receiveMessageIntoWritableStream.bind(this));
      };
      awaitShowSaveFilePicker();
    } else if (window.___DROPPR___.fileStore instanceof FileStore) {
      // FileStore is pre-loaded and already cleared, check src/index.js
      this._fileStore = window.___DROPPR___.fileStore;
      this._setupPeerConnection(this._receiveMessageIntoFileStore.bind(this));
    } else {
      // terribly outdated browsers
      throw new Error('incompatible browser');
    }
  }

  

  /**
   * @param {function} handleMessage - function to call upon receiving a message from the peer
   */
  _setupPeerConnection(handleMessage) {
    // attempt to open a connection with the dropper and wait for a WebRTC data channel to open
    this._peer = new Peer(false);
    this._peer.addEventListener('datachannel', (event) => {
      // only one data channel should be opened; peer is being sus
      if (this._dataChannel !== null) {
        this._peer.close();
        this._peer = null;
        this.error = new Error("a second data channel was opened.");
        this.dispatchEvent(new Event('aborted'));
        return;
      }

      // prepare data channel and receive messages
      this._dataChannel = event.channel;
      this._dataChannel.binaryType = 'blob'; // make sure received messages are blobs
      this._dataChannel.addEventListener('message', handleMessage);
      this.dispatchEvent(new Event('connected'));
    });
    this._peer.addEventListener('disconnected', () => {
      this.dispatchEvent(new Event('disconnected'));
    });
  }



  /**
   * @param {MessageEvent} event - event.data containing the blob or text message sent by dropper
   */
  async _receiveMessageIntoWritableStream(event) {
    const data = event.data;

    // got binary data for the file
    if (data instanceof Blob) {
      this._blob = new Blob([this._blob, data], { type: 'application/octet-stream' });
      this.bytesReceived += data.size;

      if (this._state === 'receive') {
        this._state = 'receiving'; // next message shouldn't write

        // write the compiled blob from the last n messages to the writable stream
        const compiledBlob = this._blob;
        this._blob = new Blob([], { type: 'application/octet-stream' });
        await this._writableStream.write(compiledBlob);

        // got done message while awaiting the above; peer connection was closed
        if (this._state === 'done') {
          // write any remaining data, if there is any
          if (this._blob.size > 0) {
            await this._writableStream.write(this._blob);
          }

          // close the file and dispatch done event
          await this._writableStream.close();
          this.dispatchEvent(new Event('done'));
          this.close();
        } else {
          this._state = 'receive';
        }
      }
      // else, this._blob has expanded for the next message
    } else if (typeof data === 'string' && data === 'done') {
      // close peer connection; shouldn't receive any more messages
      this._peer.close();
      this._peer = null;

      console.log("Info in Receiver._receiveMessageIntoWritableStream: got done message");

      // no writes are currently happening; be done with the transfer
      if (this._state === 'receive') {
        await this._writableStream.close();
        this.dispatchEvent(new Event('done'));
        this._state = 'done';
        this.close();
      } else {
        // a write is currently happening; when it's done, it will clean up
        this._state = 'done';
      }
    }
  }



  /**
   * @param {MessageEvent} event - event.data containing the blob or text message sent by dropper
   */
  async _receiveMessageIntoFileStore(event) {
    try {
      const data = event.data;

      // got binary data for the file
      if (data instanceof Blob) {
        this._blob = new Blob([this._blob, data], { type: 'application/octet-stream' });

        if (this._state === 'receive') {
          this._state = 'receiving'; // next message shouldn't open a transaction

          // prepare a compiled blob of received messages so far
          const compiledBlob = this._blob;
          this._blob = new Blob([], { type: 'application/octet-stream' });

          // get the offset to write into the file store
          const offset = this.bytesReceived;
          this.bytesReceived += compiledBlob.size;

          try {
            await this._fileStore.add(offset, compiledBlob);
          } catch (err) {
            console.log('Error in Receiver._receiveMessageIntoFileStore: ' + err.toString());
          }

          // got done message while awaiting the above; peer connection was closed
          if (this._state === 'done') {
            // write any remaining data, if there is any
            if (this._blob.size > 0) {
              const offset = this.bytesReceived;
              this.bytesReceived += this._blob.size;

              try {
                await this._fileStore.add(offset, this._blob);
              } catch (err) {
                console.log('Error in Receiver._receiveMessageIntoFileStore: ' + err.toString());
              }

              // free memory, basically
              this._blob = new Blob([], { type: 'application/octet-stream' });
            }

            await this._downloadFromFileStore();
          } else {
            this._state = 'receive'; // next event may receive
          }
        }
      } else if (typeof data === 'string' && data === 'done') {
        // close peer connection; shouldn't receive any more messages
        this._peer.close();
        this._peer = null;
  
        // no writes are currently happening; be done with the transfer
        if (this._state === 'receive') {
          await this._downloadFromFileStore();
        } else {
          // a write is currently happening; when it's done, it will clean up
          this._state = 'done';
        }
      }
    } catch (err) {
      console.log('Error in Receiver._receiveMessageIntoFileStore: ' + err.toString());
      this.error = err;
      this.dispatchEvent(new Event('aborted'));
      this.close();
    }
  }



  async _downloadFromFileStore() {
    // get the file from IndexedDB
    this.dispatchEvent(new Event('processing'));
    const fileBlob = await this._fileStore.flush(this.file.size, this.file.type, (progress) => {
      this.processingProgress = progress;
    });

    // download the file
    const downloadElement = document.createElement('a');
    downloadElement.href = URL.createObjectURL(fileBlob);
    downloadElement.download = this.file.name;
    downloadElement.click();

    // wait five seconds before clearing the file store
    await new Promise((resolve) => {
      setTimeout(resolve, 5000);
    });

    // clean up from the IndexedDB
    this.dispatchEvent(new Event('cleanup'));
    await this._fileStore.clear((progress) => {
      this.processingProgress = progress;
    });

    // all done
    this.dispatchEvent(new Event('done'));
    this.close();
  }



  close() {
    if (this._fileStore !== null) {
      this._fileStore.close();
      this._fileStore = null;
    }

    if (this._peer !== null) {
      this._peer.close();
      this._peer = null;
    }
  }
}