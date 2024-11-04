// FileStore.js

// increase this when updating the db schema
const _databaseVersion = 4;

/* FileStore - Use IndexedDB to store and get files
 *
 * public methods:
 *
 * constructor()     - open the database
 * add(offset, blob) - add blob for a file
 * flush()           - get a combined blob for a given label
 * clearBlobs()      - clear the file store
 * close()           - close the database connection
 *
 * dispatches events:
 *
 * openerror -> Event
 * open      -> Event
 * error     -> Event
 */
export class FileStore extends EventTarget {
  // private fields

  _database; // the database
  _offset = 0;

  // public fields

  error;

  // constructor

  constructor() {
    super();

    const openRequest = window.indexedDB.open('fileStore', _databaseVersion);

    openRequest.addEventListener('error', (event) => {
      this.error = event.target.error;
      this.dispatchEvent(new Event('openerror'));
    });

    openRequest.addEventListener('blocked', () => {
      this.error = new Error('IndexedDB open request was blocked');
      this.dispatchEvent(new Event('openerror'));
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      // delete the blobs object store if it exists
      if (event.target.result.objectStoreNames.contains('blobs')) {
        console.log('FileStore: Deleting blobs object store...');
        event.target.result.deleteObjectStore('blobs');
      }

      // object store for blobs with label and offset as keys
      event.target.result.createObjectStore('blobs', { keyPath: ['offset'] });
    });

    openRequest.addEventListener('success', async (event) => {
      this._database = event.target.result;
      this._openRequest = null;

      this.dispatchEvent(new Event('open'));
    });
  }

  // public methods

  // add blob data for a file
  async add(offset, blob) {
    // return the IDBRequest for this transaction
    const request = this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs')
      .add({ offset, blob });

    return new Promise((resolve, reject) => {
      request.addEventListener('success', resolve);
      request.addEventListener('error', (event) => {
        this.error = event.target.error;
        reject(this.error);
      })
    });
  }

  // flush all blobs into a single blob
  async flush(size, type, setPercentage) {
    // start a read-only transaction on the blobs object store
    const blobs = this._database
      .transaction(['blobs'], 'readwrite')
      .objectStore('blobs');

    // empty blob
    let combinedBlob = new Blob([], { type });

    // start a cursor from zero to hero
    const offsetRange = IDBKeyRange.bound([0], [size]);
    const cursorRequest = blobs.openCursor(offsetRange);

    return new Promise((resolve, reject) => {
      cursorRequest.addEventListener('success', (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const blob = cursor.value.blob;
          combinedBlob = new Blob([combinedBlob, blob], { type });

          cursor.continue(); // continue to the next item

          // for progress reporting
          setPercentage(Math.round(100 * combinedBlob.size / size));
        } else {
          resolve(combinedBlob); // return the blob
        }
      });

      cursorRequest.addEventListener('error', (event) => {
        this.error = event.target.error;
        reject(this.error);
      });
    });
  }

  async clear(setPercentage) {
    return new Promise((resolve, reject) => {
      const countRequest = this._database
        .transaction(['blobs'], 'readwrite')
        .objectStore('blobs')
        .count();

      // got count of records in blobs
      countRequest.addEventListener('success', (event) => {
        const count = event.target.result;
        const cursorRequest = this._database
          .transaction(['blobs'], 'readwrite')
          .objectStore('blobs')
          .openCursor();

        let i = 0;

        // on item in blobs
        cursorRequest.addEventListener('success', (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();

            // for reporting purposes
            setPercentage(Math.round(100 * i / count));
            i++;
          } else {
            resolve(); // all done
          }
        });
  
        // reject
        cursorRequest.addEventListener('error', (event) => {
          this.error = event.target.error;
          reject();
        });
      });

      // reject
      countRequest.addEventListener('error', (event) => {
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