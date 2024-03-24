import React, { useState, useEffect } from 'react';

import { Header, Footer } from '../components/index.js';
import * as droppr from '../interface';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Receiver(props) {
  const { id } = props;

  const [status, setStatus] = useState('waiting');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [fileInfo, setFileInfo] = useState({});
  const [download, setDownload] = useState({});
  const [lastBytes, setLastBytes] = useState(0);

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
        setDownloadStatus(
          `Received ${(bytes / MB).toFixed(2)} of ${(size / MB).toFixed(2)} MB (${speed} MBps) ${percent}`
        );

        return bytes;
      });

      const name = droppr.getName();
      const size = droppr.getSize();
      const type = droppr.getType();

      setFileInfo({ name, size, type });
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
          setDownload(update.download);
          clearInterval(checkStatusInterval);
          setDownloadStatus('');
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

  return (
    <div>
      <Header />
      <div className="flex items-center justify-center my-10">
        <p className="text-3xl font-light">Peer-to-peer ✨.</p>
      </div>

      {/* Drop-zone */}
      <div className='flex flex-col flex-nowrap mx-auto w-3/4 h-3/4 items-center justify-center'>
        <br />
        <br />
        <br />
        <br />
        <img src='/file.png' width='48px' height='48px' />
        <br />
        <p className='font-semibold'>{fileInfo.name}</p>
        <p>{(droppr.getSize() / 1024).toFixed(1)} kB</p>
        <br />
        {fileInfo.name !== undefined ? (
          <>
            <a href={download.href} className={download.href ? 'text-blue-500' : 'text-slate-500'}>Download {fileInfo.name}.</a>
            <br />
          </>
        ) : []}
        <p className='text-slate-500'>{status}</p>
        { download.href === undefined ? <p className='text-slate-500'>{downloadStatus}</p> : []}
      </div>
      <Footer/>
    </div>
  );
}
