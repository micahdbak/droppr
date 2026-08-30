import axios from "axios";

import { Peer } from "./peer.js";
import { FileStore, getFileStore } from "./file_store.js";

/**
 * dispatches error, connected, disconnected, processing, cleanup, done
 * @extends EventTarget
 */
export class Receiver extends EventTarget {
  _peer = null;
  _fileStore = null;
  file = {
    name: "tmp.bin",
    size: 0,
    type: "application/octet-stream",
    href: "",
  }; // information on the file being received
  bytesReceived = 0; // number of bytes received from the peer
  processingProgress = 0; // progress of processing file, from 0 to 100
  error = null;

  /**
   * @param {object} file - information on the file to receive
   * @param {string} file.name
   * @param {number} file.size
   * @param {string} file.type
   * @param {string} [file.href]
   * @param {RTCIceServer[]} [turnServers]
   */
  constructor(file, fileStore, turnServers = []) {
    super(); // EventTarget

    this.file = file;
    this._turnServers = turnServers;

    if (fileStore === null) {
      // Chromium-based browsers; use the File System Access API
      this._fileSystemAccessApiLoop();
    } else if (fileStore instanceof FileStore && fileStore.error === null) {
      // non-Chromium browsers; use IndexedDB
      this._fileStore = fileStore;
      this._indexedDbLoop();
    } else {
      // terribly outdated browsers
      throw new Error("incompatible browser");
    }
  }

  /**
   * receive a file for Chromium-based browsers
   */
  async _fileSystemAccessApiLoop() {
    try {
      // prompt the user to choose a download location
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: this.file.name,
      });
      const writableStream = await fileHandle.createWritable();
      this._peer = new Peer(false, this._turnServers);

      // for UI informative purposes; peer will handle reconnection internally
      this._peer.addEventListener("error", (event) => {
        this.error = new Error("peer error", { cause: event.target.error });
        this.dispatchEvent(new Event("error"));
      });
      this._peer.addEventListener("connected", () =>
        this.dispatchEvent(new Event("connected")),
      );
      this._peer.addEventListener("disconnected", () =>
        this.dispatchEvent(new Event("disconnected")),
      );

      while (this.bytesReceived < this.file.size) {
        // if not connected, this will block until connected
        const blob = await this._peer.receive();

        // write blob to file
        await writableStream.write(blob);
        this.bytesReceived += blob.size;
      }

      // no more blobs to receive; clean up
      this._peer.close();
      await writableStream.close();
      this.dispatchEvent(new Event("done"));
    } catch (err) {
      this._peer?.close();
      this.error = err;
      this.dispatchEvent(new Event("error"));
    }
  }

  /**
   * receive a file for non-Chromium-based browsers
   */
  async _indexedDbLoop() {
    try {
      /**
       * @type {FileStore}
       */
      const fileStore = this._fileStore;
      this._peer = new Peer(false, this._turnServers);

      // for UI informative purposes; peer will handle reconnection internally
      this._peer.addEventListener("error", (event) => {
        this.error = new Error("peer error", { cause: event.target.error });
        this.dispatchEvent(new Event("error"));
      });
      this._peer.addEventListener("connected", () =>
        this.dispatchEvent(new Event("connected")),
      );
      this._peer.addEventListener("disconnected", () =>
        this.dispatchEvent(new Event("disconnected")),
      );

      while (this.bytesReceived < this.file.size) {
        // if not connected, this will block until connected
        const blob = await this._peer.receive();

        // write blob to file store
        // the add must come before the offset update
        await fileStore.add(this.bytesReceived, blob);
        this.bytesReceived += blob.size;
      }

      // no more blobs to receive; process file and download
      this._peer.close();

      // get the file from IndexedDB
      this.dispatchEvent(new Event("processing"));
      const compiledBlob = await fileStore.flush(
        this.file.size,
        this.file.type,
        (progress) => {
          this.processingProgress = progress;
        },
      );

      // download the file
      const downloadElement = document.createElement("a");
      downloadElement.href = URL.createObjectURL(compiledBlob);
      downloadElement.download = this.file.name;
      downloadElement.click();

      // wait ten seconds before clearing the file store
      // TODO: something more reliable than this
      await new Promise((resolve) => {
        setTimeout(resolve, 10000);
      });

      // clean up from the IndexedDB
      this.dispatchEvent(new Event("cleanup"));
      await fileStore.clear((progress) => {
        this.processingProgress = progress;
      });

      // all done
      this.dispatchEvent(new Event("done"));
    } catch (err) {
      this._peer?.close();
      this.error = err;
      this.dispatchEvent(new Event("error"));
    }
  }
}

// singleton
let receiver = null;

/**
 * @param {string} code
 * @param {(receiver: Receiver) => void} addEventListeners
 * @returns {Promise<Receiver>}
 */
export async function receiveFile(code, addEventListeners) {
  if (receiver !== null) {
    return receiver;
  }

  // if this errors, it will bubble up
  const fileStore = await getFileStore();

  // will throw an error if the drop was not able to be claimed
  const res = await axios.post("/api/claim/" + code.toUpperCase());

  const file = res.data.file;

  console.log("issued TURN credentials:", res.data.turn);
  const turnServers = res.data.turn ? [res.data.turn] : [];

  receiver = new Receiver(file, fileStore, turnServers);

  receiver.addEventListener("done", () => {
    receiver = null;
  });

  receiver.addEventListener("error", () => {
    receiver = null;
  });

  addEventListeners(receiver);
  return receiver;
}
