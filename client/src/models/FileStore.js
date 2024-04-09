// Copyright (C) 2024 droppr. All rights reserved.
//
// models/
// FileStore.js

// increase this when updating the db schema
const _databaseVersion = 2;

/* FileStore - Use IndexedDB to store and get files
 *
 * public methods:
 *
 * constructor() - Open the database.
 *
 * clearFile(name, size)
 * - clear all blobs for a file
 *
 * addBlob(label, offset, blob)
 * - add blob for a file
 *
 * getFile(label)
 * - get a combined blob for a given label
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

    const openRequest = window.indexedDB.open('fileStore', _databaseVersion);

    openRequest.addEventListener('error', (event) => {
      this.dispatchEvent(
        new MessageEvent('error', { data: event.target.errorCode })
      );
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      // delete the blobs object store if it exists
      if (event.target.result.objectStoreNames.contains("blobs")) {
        console.log('FileStore: Deleting blobs object store');
        event.target.result.deleteObjectStore("blobs");
      }

      // object store for blobs with label and offset as keys
      event.target.result.createObjectStore('blobs', {
        keyPath: ['label', 'offset']
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
  clearFile(name, size) {
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

    // this will pretend to be an IDBRequest object
    const fakeRequest = new EventTarget();

    fakeRequest.readyState = 'pending';

    transaction.addEventListener('complete', () => {
      fakeRequest.readyState = 'done';
      fakeRequest.dispatchEvent(new Event('success'));
    });

    transaction.addEventListener('error', (event) => {
      fakeRequest.error = event.target.error;
      fakeRequest.dispatchEvent(new Event('error'));
    });

    return fakeRequest;
  }

  // add blob data for a file
  addBlob(label, offset, blob) {
    // return the IDBRequest for this transaction
    return this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs')
      .add({ label, offset, blob });
  }

  // get a combined blob for a given label
  async getFile(label, size, type) {
    // start a read-only transaction on the blobs object store
    const transaction = this._database.transaction(['blobs'], 'readonly');
    const blobs = transaction.objectStore('blobs');

    let combinedBlob = null;

    // get an offset range for each item in the object store for this file
    const offsetRange = IDBKeyRange.bound([label, 0], [label, size]);

    // start a cursor request given the offset range
    const cursorRequest = blobs.openCursor(offsetRange);

    // at each offset
    cursorRequest.addEventListener('success', (event) => {
      const cursor = event.target.result;

      if (cursor) {
        const blob = cursor.value.blob;
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
