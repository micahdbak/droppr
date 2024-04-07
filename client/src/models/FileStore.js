// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// FileStore.js

// increase this when updating the db schema
const _databaseVersion = 1;

/* FileStore - Use IndexedDB to store and get files
 *
 * public methods:
 *
 * constructor() - Open the database.
 *
 * clearFile(name, size)
 * - clear all blobs for a file
 *
 * addBlob(filename, offset, data)
 * - add blob data for a file
 *
 * getFile(filename)
 * - get a combined blob for a given filename
 *
 * close()
 * - close the database connection
 *
 * dispatches events:
 *
 * 'error' -> MessageEvent (event.data has an error message)
 * - An error occurred.
 *
 * 'open' -> Event
 * - The database is opened and ready.
 */
export class FileStore extends EventTarget {
  // private fields

  _database = null; // the database

  // constructor

  constructor() {
    super();

    const openRequest = window.indexedDB.open('fileStore', 1);

    openRequest.addEventListener('error', (event) => {
      this.dispatchEvent(
        new MessageEvent('error', { data: event.target.errorCode })
      );
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      // object store for blobs with filename and offset as keys
      event.target.result.createObjectStore('blobs', {
        keyPath: ['filename', 'offset']
      });
    });

    openRequest.addEventListener('success', (event) => {
      this._database = event.target.result;
      this.dispatchEvent(new Event('open'));
      this._openRequest = null;
    });
  }

  // public methods

  // clear all blobs for a file
  async clearFile(name, size) {
    // start a read-only transaction on the blobs object store
    const transaction = this._database.transaction(['blobs'], 'readwrite');
    const blobs = transaction.objectStore('blobs');

    // get an offset range for each file in the object store for this file
    const offsetRange = IDBKeyRange.bound([name, 0], [name, size]);

    // start a cursor request given the offset range
    const cursorRequest = blobs.openCursor(offsetRange);

    // at each offset
    cursorRequest.addEventListener('success', (event) => {
      const cursor = event.target.result;

      if (cursor) {
        cursor.delete(); // delete the entry
        cursor.continue(); // continue to the next
      }
    });

    // wait for the transaction to complete
    await new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', reject);
    });
  }

  // add blob data for a file
  addBlob(filename, offset, data) {
    // return the IDBRequest for this transaction
    return this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs')
      .add({ filename, offset, data });
  }

  // get a combined blob for a given filename
  async getFile(name, size, type) {
    // start a read-only transaction on the blobs object store
    const transaction = this._database.transaction(['blobs'], 'readonly');
    const blobs = transaction.objectStore('blobs');

    let combinedBlob = null;

    // get an offset range for each item in the object store for this file
    const offsetRange = IDBKeyRange.bound([name, 0], [name, size]);

    // start a cursor request given the offset range
    const cursorRequest = blobs.openCursor(offsetRange);

    // at each offset
    cursorRequest.addEventListener('success', (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const blob = cursor.value.data;
        const offset = cursor.key[1];

        if (combinedBlob === null) {
          combinedBlob = new Blob([blob], { type });
        } else {
          combinedBlob = new Blob([combinedBlob, blob], { type });
        }

        // proceed to next item
        cursor.continue();
      }
    });

    // wait for the transaction to complete
    await new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', reject);
    });

    return combinedBlob;
  }

  close() {
    if (this._database !== null) {
      this._database.close();
      this._database = null;
    }
  }
}
