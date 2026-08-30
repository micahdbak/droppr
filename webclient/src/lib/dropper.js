import { Peer } from "./peer.js";

const MESSAGE_SIZE = 16384;

/**
 * dispatches error, connected, disconnected, done
 * @extends EventTarget
 */
export class Dropper extends EventTarget {
  _peer = null;
  file = null; // the file being sent
  bytesSent = 0; // the number of bytes sent so far
  error = null;

  /**
   * @param {File} file - the file to drop
   * @param {RTCIceServer[]} [turnServers] - issued at register time
   */
  constructor(file, turnServers = []) {
    super();

    // start dropping the file
    this._dropFile(file, turnServers);
  }

  /**
   * @param {File} file
   * @param {RTCIceServer[]} turnServers
   */
  async _dropFile(file, turnServers) {
    try {
      this._peer = new Peer(true, turnServers);

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

      while (this.bytesSent < file.size) {
        // slice the file given the current offset
        const end = Math.min(this.bytesSent + MESSAGE_SIZE, file.size);
        const blob = file.slice(this.bytesSent, end);

        // send blob to peer
        await this._peer.send(blob);
        this.bytesSent = end; // update offset for next loop
      }

      // let the last buffered messages drain before closing
      await this._peer.drain();
      this._peer.close();
      this.dispatchEvent(new Event("done"));
    } catch (err) {
      this._peer?.close();
      this._peer = null;
      this.error = err;
      this.dispatchEvent(new Event("error"));
    }
  }
}

// singleton
let dropper = null;

/**
 * @param {File} file
 * @param {RTCIceServer[]} [turnServers]
 * @param {(dropper: Dropper) => void} addEventListeners
 * @returns {Dropper}
 */
export function dropFile(file, turnServers = [], addEventListeners) {
  if (dropper !== null) {
    return dropper;
  }

  dropper = new Dropper(file, turnServers);

  dropper.addEventListener("done", () => {
    dropper = null;
  });

  dropper.addEventListener("error", () => {
    dropper = null;
  });

  addEventListeners(dropper);
  return dropper;
}
