import React, { useState, useEffect } from 'react';

import { Header } from '../components/index';
import * as droppr from '../interface';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Receiver(props) {
  const [status, setStatus] = useState('Waiting...');
  const [downloadHref, setDownloadHref] = useState('');
  const [downloadName, setDownloadName] = useState('');
  const [lastBytes, setLastBytes] = useState(0);

  const { id } = props;

  // run on page load
  useEffect(() => {
    // check statuses every 100ms
    const checkStatusInterval = setInterval(() => {
      setLastBytes((_lastBytes) => {
        const bytes = droppr.getBytes();
        const size = droppr.getSize();
        const percentage = ((100 * bytes) / size).toFixed(1);
        const speed = (((bytes - _lastBytes) / statusInterval) / 1000).toFixed(1) // MBps
        const percent = size ? `(${percentage}%).` : "";

        // set status to be a summary of received bytes
        setStatus(
            `Received ${(bytes / MB).toFixed(1)} of ${(size / MB).toFixed(1)} MB (${speed} MBps) ${percent}`
          );

        return bytes;
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
          setDownloadHref(update.download.href);
          setDownloadName(update.download.name);
        }

        setStatus(update.status);
      });
    } else {
      // pass
    }

    return () => {
      clearInterval(checkStatusInterval);
    };
  }, []);

  useEffect(() => {
    console.log(downloadName);
  }, [downloadName]);

  return (
    <>
      <Header />
      <div className="flex items-center justify-center flex-col mt-20">
        <p className="font-semibold">{status}</p>
        <button className=" bg-slate-100 rounded-lg mt-4  hover:bg-slate-200 hover:cursor-pointer px-4 py-3 transition ease-in-out hover:scale-110 border border-b">
          <a href={downloadHref} download={downloadName}>
            Download
          </a>
        </button>
      </div>
    </>
  );
}
