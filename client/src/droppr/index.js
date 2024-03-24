/* Droppr interface:
 *
 * function drop(file, onRegistered, onUpdate) // returns nothing
 * - Register a drop, providing a File object representing the file to be dropped.
 *   When the drop is registered, the onRegistered callback will be called providing the identifier of the drop (to be shared with a recipient).
 *   When a recipient is connected, or as the transfer happens, or as the status of the drop changes, the onUpdate callback will be called providing a status message that should be displayed.
 *   Example usage:
 *     drop(someFile, (_id) => { setDropId(_id) }, (_status) => { setStatus(_status) });
 *
 * function receive(id, onUpdate, onDownload) // returns nothing
 * - Receive a drop, providing the identifier of the drop (retrieved from the drop function, above).
 *   When the dropper is connected, or as the transfer happens, or as the status of the drop changes, the onUpdate callback will be called providing a status message that should be displayed.
 *   When the file is finished downloading, the onDownload callback will be called with an object like the following:
 *     onDownload({ href: (URL of the downloaded file; refers to a Blob), name: (name of the file), size: (size of the file), type: (MIME type of the file) });
 *   Example usage:
 *     receive(someDropId, (_status) => { setStatus(_status) }, (_download) => { setDownload(_download) });
 *
 * function getBytes() // returns number
 * - Get the current number of bytes dropped, or received.
 *
 * function getSize() // returns number
 * - Get the size of the file being dropped, or received.
 *
 * function getSpeed() // returns number (floating)
 * - Get the speed of the download or transfer (in kilobytes per second).
 *
 * function getName() // returns string
 * - Get the name of the file being dropped, or received.
 */

console.log('Droppr. All rights reserved.');

function drop(file, onRegistered, onUpdate) {
  onRegistered(1); // drop identifier is 1, lol

  setTimeout(() => {
    onUpdate('connected'); // receiver has connected
  }, 5000); // 5 seconds

  // pass
}

function receive(id, onUpdate, onDownload) {
  setTimeout(() => {
    onUpdate('connected'); // receiver has connected
  }, 2000); // 2 seconds

  setTimeout(() => {
    onDownload({
      href: '/',
      name: 'file.txt',
      size: 1024,
      type: 'text/plain',
    });
  }, 5000); // 5 seconds
}

function getBytes() {
  return 0;
}

function getSize() {
  return 1024;
}

function getSpeed() {
  return 10; // 10 kBps
}

function getName() {
  return 'file.txt';
}

module.exports = {
  drop,
  receive,
  getBytes,
  getSize,
  getSpeed,
  getName,
};

