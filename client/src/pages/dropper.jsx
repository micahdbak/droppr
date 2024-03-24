import React, { useState, useEffect } from 'react';

import * as droppr from '../interface';
import { Header } from '../components/index';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Dropper() {
  const [bytes, setBytes] = useState(0);
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState({});
  const [isDropping, setIsDropping] = useState(false);
  const [lastBytes, setLastBytes] = useState(0);
  const [recipientHref, setRecipientHref] = useState('');
  const [status, setStatus] = useState('');
  const [transferid, setTransferid] = useState('');

  //setting file info
  function handleFile(event) {
    const newFile = event.target.files[0];
    if (newFile) {
      setFileInfo({
        name: newFile.name,
        size: newFile.size,
        type: newFile.type,
      });

      setFile(newFile);
      setStatus('File is read to drop.');
    }
  }

  //handing dropping files ()
  function handleDrop() {
    /*
    if (file === null) {
      setStatus('Please upload a file.');
      return;
    }
    */

    setIsDropping(true);

    droppr.drop(file, (update) => {
      setFile(null);

      // if it provides the id attribute
      if (update.id) {
        setTransferid(update.id);
      }

      // update status based on what was given in this update
      setStatus(update.status);

      // various other attributes might be given in update
    });
  }

  // update statuses (typically every 100ms)
  useEffect(() => {
    if (isDropping) {
      const percentage = ((100 * bytes) / fileInfo.size).toFixed(1);
      const speed = (((bytes - lastBytes) / statusInterval) / 1000).toFixed(1) // MBps

      if (bytes === 0) {
        setStatus('Waiting...');
      } else {
        setStatus(`Dropped ${(bytes / MB).toFixed(1)} of ${(fileInfo.size / MB).toFixed(1)} MBs (${speed} MBps) (${percentage}%).`);
      }
      setLastBytes(bytes);
    }
  }, [bytes, fileInfo, isDropping]);

  // on page load
  useEffect(() => {
    // every 100ms
    const checkStatusInterval = setInterval(() => {
      // trigger status update (see above effect)
      setBytes(droppr.getBytes());
    }, statusInterval);

    return () => {
      clearInterval(checkStatusInterval);
    };
  }, []);

  return (
    <div>
      <Header />

      <div>
        <input type="file" onChange={handleFile} />
        <button type="button" onClick={handleDrop}>
          Drop
        </button>
      </div>

      <br />
      <p>{status}</p>
      <p>?id={transferid}</p>
    </div>
  );
}
