// receiver App

import React, { useState, useEffect } from 'react';

import * as droppr from '../interface';

const statusInterval = 100; // 100ms

export function Receiver(props) {
  //const [view, setView] = useState('droppr'); //use for header
  const [status, setStatus] = useState('Waiting...');
  const [downloadHref, setDownloadHref] = useState('');
  const [downloadName, setDownloadName] = useState('');

  const { id } = props;

  // run on page load
  useEffect(() => {
    // check statuses every 100ms
    const checkStatusInterval = setInterval(() => {
      const bytes = droppr.getBytes();
      const speed = droppr.getSpeed(); // Bpms == kBps
      const size = droppr.getSize();
      const percentage = Math.round((100 * bytes) / fileInfo.size);

      // set status to be a summary of received bytes
      setStatus(`Received ${bytes} of ${size} bytes (${speed} kBps) (${percentage}%).`);
    }, statusInterval);

    // read transferid from URL

    if (id) {

      droppr.receive(id, (update) => {
        // stop updating status
        clearInterval(checkStatusInterval);
        setStatus('');
        if (update.download) {
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
