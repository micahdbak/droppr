// receiver App

import React, { useState, useEffect } from 'react';

import * as droppr from '../interface';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Receiver(props) {
  //const [view, setView] = useState('droppr'); //use for header
  const [status, setStatus] = useState('Waiting...');
  const [downloadHref, setDownloadHref] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [lastBytes, setLastBytes] = useState(0);

  const { id } = props;

  // run on page load
  useEffect(() => {
    // check statuses every 100ms
    const checkStatusInterval = setInterval(() => {
      setLastBytes(_lastBytes => {
        const bytes = droppr.getBytes();
        const size = droppr.getSize();
        const percentage = ((100 * bytes) / size).toFixed(1);
        const speed = (((bytes - _lastBytes) / statusInterval) / 1000).toFixed(1) // MBps
        const percent = size ? `(${percentage}%).` : "";

        // set status to be a summary of received bytes
        setStatus(
            `Received ${(bytes / MB).toFixed(1)} of ${(size / MB).toFixed(1)} MB (${speed} MBps) ${percent}`
          );

        return bytes; // update lastBytes
      });
    }, statusInterval);

    // read transferid from URL

    if (id) {
      droppr.receive(id, (update) => {
        // stop updating status
        clearInterval(checkStatusInterval);
        setStatus('');

        if (update.download) {
          console.log('got download');
          console.log(update.download);
          setDownloadHref(update.download.href); // <a href={downloadHref}>... // set React state
          setDownloadName(update.download.name); // ...{downloadName}</a> // set React state
        }

        setStatus(update.status); // set React state
      });
    } else {
      // pass
    }

    return () => {
      // clear intervals
      clearInterval(checkStatusInterval);
    };
  }, []);

  useEffect(() => {
    console.log(downloadName);
  }, [downloadName]);

  return (
    <>
      <p>{status}</p>
      <a href={downloadHref} download={downloadName}>
        Download
      </a>
    </>
  );
}
