// FileStore.js

// increase this when updating the db schema
const DB_VERSION = 4;



/**
 * @extends EventTarget
 */
export class FileStore extends EventTarget {



  _database; // the database
  _offset = 0;
  error;



  constructor() {
    super();

    const openRequest = window.indexedDB.open('fileStore', DB_VERSION);

    openRequest.addEventListener('error', (event) => {
      this.error = new Error('open request error', { cause: event.target.error });
      this.dispatchEvent(new Event('openerror'));
    });

    openRequest.addEventListener('blocked', () => {
      this.error = new Error('open request was blocked');
      this.dispatchEvent(new Event('openerror'));
    });

    openRequest.addEventListener('upgradeneeded', (event) => {
      try {
        // delete the blobs object store if it exists
        if (event.target.result.objectStoreNames.contains('blobs')) {
          event.target.result.deleteObjectStore('blobs');
        }

        // object store for blobs with label and offset as keys
        event.target.result.createObjectStore('blobs', { keyPath: ['offset'] });
      } catch (err) {
        this.close();
        this.error = err;
        this.dispatchEvent(new Event('openerror'));
      }
    });

    openRequest.addEventListener('success', async (event) => {
      this._database = event.target.result;
      this._openRequest = null;

      this.dispatchEvent(new Event('open'));
    });
  }



  /**
   * @param {number} offset 
   * @param {Blob} blob 
   */
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



  /**
   * @param {number} size 
   * @param {string} type 
   * @param {function} setPercentage 
   * @returns {Blob}
   */
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
        this.error = new Error('cursor request error', { cause: event.target.error });
        reject(this.error);
      });
    });
  }



  /**
   * @param {function} setPercentage
   */
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
          this.error = new Error('cursor request error', { cause: event.target.error });
          reject();
        });
      });

      // reject
      countRequest.addEventListener('error', (event) => {
        this.error = new Error('cursor request error', { cause: event.target.error });
        reject();
      });
    })
  }



  close() {
    this._database?.close();
    this._database = null;
  }
}
