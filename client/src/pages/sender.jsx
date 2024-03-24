import React, {useState, useEffect } from 'react';

import * as droppr from '..droppr.js';

const statusInterval = 100;

export function App() {
    const [bytes, setBytes] = useState(0);
    const [file, setFile] = useState(null);
    const [fileInfo, setFileInfo] = useState({});
    const [isDropping, setIsDropping] = useState(false);
    const [recipientHref, setRecipientHref] = useState('');
    const [status, setStatus] = useState('');
    const [transferid, setTransferid] = useState('');

    //setting file info
    function handleFile(event) {
        const newFile = event.target.files[0];
        if (newFile) {
            setFileInfo = ({
                name: droppr.getName(),
                size: droppr.getSize(),
                type: newFile.type, //no getType function in droppr.js
            });
            
            setFile(newFile);
            setStatus('File is read to drop.');
        }
    }

    //handing dropping files ()
    function handleDrop() {
        if (file === null) {
            setStatus('Please upload a file.');
            return;
        }

        setIsDropping(true);

        droppr.drop(file, (update) => {
            setFile(null);
            // if it provides the id attribute
            if (update.id) 
                setTransferid(update.id);

            // update status based on what was given in this update
            setStatus(update.status);

            // various other attributes might be given in update
        });
    }

  // update statuses (typically every 100ms)
  useEffect(() => {
    if (isDropping) {
      const speed = droppr.getSpeed(); // 8Bpms == kBps
      const percentage = Math.round((100 * bytes) / fileInfo.size);

      if (bytes === 0) {
        setStatus('Waiting...');
      } else {
        setStatus(`Dropped ${bytes} of ${fileInfo.size} bytes (${speed} kBps) (${percentage}%).`);
      }
    }
  }, [bytes, fileInfo, isDropping]);

  // on page load
  useEffect(() => {
    // every 100ms
    const checkStatusInterval = setInterval(() => {

      if (transferid === '') {
        setRecipientHref('');
      } else {
        setRecipientHref(`receive?transferid=${transferid}`);
      }

      // trigger status update (see above effect)
      setBytes(droppr.getBytes());
    }, statusInterval);

    return () => {
      clearInterval(checkStatusInterval);
    };
  }, []);

  return (
    <div>
      <h1>Droppr.</h1>
      <hr />
      <input type="file" onChange={handleFile} />
      <button type="button" onClick={handleDrop}>
        Drop
      </button>
      <br />
      <p>{status}</p>
      {recipientHref !== '' ? <a href={recipientHref}>Recipient link ({recipientHref})</a> : []}
    </div>
  );
}

