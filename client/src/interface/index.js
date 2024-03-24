/* Droppr Interface
 *
 * exports: drop, receive, getBytes, getSize, getSpeed, getName
 *
 * function drop(file, onUpdate) ; returns nothing
 * - Register a drop, providing a File object representing the file to be dropped.
 *   The onUpdate callback will be called in the following events:
 *   - 'registered'
 *     The drop is registered, and a drop identifier is given by the 'id' attribute of the given argument to onUpdate.
 *   - 'connected'
 *     The recipient has connected, and the drop has begun.
 *   - 'complete'
 *     The drop is complete.
 *   Example usage:
 *     drop(someFile, (update) => {
 *       if (update.id) {
 *         setDropId(update.id); // set React state
 *       }
 *
 *       setStatus(update.status); // set React state
 *     });
 *
 * function receive(id, onUpdate) ; returns nothing
 * - Receive a drop, providing the identifier of the drop (retrieved from the drop function on another browser; see above).
 *   The onUpdate callback will be called in the following events:
 *   - 'connected'
 *     The dropper has connected, and the drop has begun.
 *   - 'complete'
 *     The drop is complete, and information about the download is given by the 'download' attribute of the given argument to onUpdate.
 *     The 'download' attribute should have the following attributes:
 *     - href (URL of the downloadable file, which is a blob)
 *     - name (name of the downloadable file)
 *     - size (size of the file, in bytes)
 *     - type (MIME type of the file, e.g., 'text/plain')
 *   Example usage:
 *     receive(someDropId, (update) => {
 *       if (update.download) {
 *         setDownloadHref(update.download.href); // <a href={downloadHref}>... // set React state
 *         setDownloadName(update.download.name); // ...{downloadName}</a> // set React state
 *       }
 *
 *       setStatus(update.status); // set React state
 *     });
 *
 * function getBytes() ; returns number
 * - Get the current number of bytes dropped, or received; should be checked routinely for updates.
 *
 * function getSize() ; returns number
 * - Get the size of the file being dropped, or received; should be checked routinely for updates.
 *
 * function getSpeed() ; returns number (floating)
 * - Get the speed of the download or transfer (in kilobytes per second); should be checked routinely for updates.
 *
 * function getName() ; returns string
 * - Get the name of the file being dropped, or received; should be checked routinely for updates.
 *
 * Example App:
 *
 * export function App() {
 *   const [status, setStatus] = useState('');
 *
 *   function onDrop() {
 *     console.log('Drop clicked');
 *     droppr.drop('this is a file :wink:', (update) => {
 *       console.log(update);
 *     });
 *   }
 *
 *   function onReceive() {
 *     console.log('Receive clicked');
 *     droppr.receive('drop identifier', (update) => {
 *       console.log(update);
 *     });
 *   }
 *
 *   return (
 *     <>
 *       <button onClick={onDrop}>Drop</button>
 *       <button onClick={onReceive}>Receive</button>
 *     </>
 *   );
 * }
 */

console.log('Droppr. All rights reserved.');

export * from './dropper.js';
export * from './receiver.js';
export * from './helpers.js';
