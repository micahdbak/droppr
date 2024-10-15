// FileStore.js

// increase this when updating the db schema
const _databaseVersion = 3;

/* FileStore - Use IndexedDB to store and get files
 *
 * public methods:
 *
 * constructor()            - open the database
 * add(label, offset, blob) - add blob for a file
 * flush(label)             - get a combined blob for a given label
 * clearBlobs()             - clear the file store
 * close()                  - close the database connection
 *
 * dispatches events:
 *
 * error   -> Event
 * blocked -> Event
 * open    -> Event
 */
export class FileStore extends EventTarget {
  // private fields

  _database; // the database

  // public fields

  error;

  // constructor

  constructor() {
    super();

    const openRequest = window.indexedDB.open('fileStore', _databaseVersion);

    openRequest.addEventListener('error', (event) => {
      this.error = event.target.error;
      this.dispatchEvent(new Event('error'));
    });

    openRequest.addEventListener('blocked', () => {
      this.dispatchEvent(new Event('blocked'));
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      // delete the blobs object store if it exists
      if (event.target.result.objectStoreNames.contains('blobs')) {
        console.log('FileStore: Deleting blobs object store');
        event.target.result.deleteObjectStore('blobs');
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

  // add blob data for a file
  add(label, offset, blob) {
    // return the IDBRequest for this transaction
    return this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs')
      .add({ label, offset, blob });
  }

  // get a combined blob for a given label
  async flush(label, size, type) {
    // start a read-only transaction on the blobs object store
    const transaction = this._database.transaction(['blobs'], 'readwrite');
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

        //cursor.delete();
        cursor.continue(); // continue to the next item
      }
    });

    // wait for the transaction to complete
    await new Promise((resolve, reject) => {
      transaction.addEventListener('complete', resolve);
      transaction.addEventListener('error', reject);
    });

    return combinedBlob;
  }

  async clearBlobs() {
    return new Promise((resolve, reject) => {
      const cursorRequest = this._database
        .transaction(['blobs'], 'readwrite')
        .objectStore('blobs')
        .openCursor();

      cursorRequest.addEventListener('success', (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      });

      cursorRequest.addEventListener('error', (event) => {
        console.error(event.target.error);
        this.error = event.target.error;
        reject();
      });
    })
  }

  close() {
    if (this._database !== null) {
      this._database.close();
      this._database = null;
    }
  }
}