// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useEffect, useState } from 'react';

import * as models from '../models/index.js';

const _intervalRate = 1000; // 1s

export function Receive(props) {
  const { id } = props;

  const [bytesReceived, setBytesReceived] = useState(0);
  const [download, setDownload] = useState([]);
  const [fileinfo, setFileinfo] = useState([]);
  const [lastBytesReceived, setLastBytesReceived] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [recipient, setRecipient] = useState(null);
  const [shouldReceive, setShouldReceive] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('waiting');
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    let _recipient = recipient;

    if (_recipient === null && shouldReceive) {
      _recipient = new models.Recipient(id);

      _recipient.addEventListener('connected', () => {
        setStatus('connected');
      });

      _recipient.addEventListener('disconnected', () => {
        setStatus('disconnected');
      });

      _recipient.addEventListener('fileinfochanged', (event) => {
        setFileinfo(event.target.fileinfo);
      });

      _recipient.addEventListener('downloadchanged', (event) => {
        setDownload(event.target.download);
      });

      setRecipient(_recipient);
    }

    if (_recipient !== null) {
      const interval = setInterval(
        (r) => {
          setBytesReceived(r.bytesReceived);
          setTotalSize(r.totalSize);
        },
        _intervalRate,
        _recipient
      );

      return () => {
        clearInterval(interval);
      };
    }
  }, [shouldReceive, recipient]);

  useEffect(() => {
    if (totalSize > 0 && bytesReceived - lastBytesReceived > 0) {
      setPercentage((bytesReceived / totalSize) * 100);
      setSpeed((bytesReceived - lastBytesReceived) / _intervalRate); // kBps
      setLastBytesReceived(bytesReceived);
    }
  }, [bytesReceived, lastBytesReceived, totalSize]);

  if (!shouldReceive) {
    return (
      <div className="fixed top-8 right-8 bottom-8 left-8">
        <div
          className={
            'w-full h-full ' +
            'flex flex-col items-center justify-center ' +
            'text-center'
          }
        >
          <p className='mb-2'>Drop identifier:<br /><b>{id}</b></p>
          <p className='mb-2'>Look right?</p>
          <button
            className="bg-blue-400 text-white px-4 py-2 rounded-lg"
            onClick={() => setShouldReceive(true)}
          >
            Receive Files
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-8 right-8 bottom-8 left-8">
      <div
        className={
          'w-full h-full ' +
          'flex flex-col items-center justify-center ' +
          'text-center'
        }
      >
        {fileinfo.length > 0 ? (
          <>
            <p>Pending Files:</p>
            {fileinfo.map((file) => (
              <p><b>{file.name}</b>, {+(file.size / 1024).toFixed(1)} kB</p>
            ))}
            <br />
          </>
        ) : []}
        {download.length > 0 ? (
          <>
            <p>Downloads:</p>
            {download.map((file) => (
              <p>
                <b>{file.name}</b>, {+(file.size / 1024).toFixed(1)} kB&nbsp;
                <a className='text-blue-400' href={file.href} download={file.name}>Download</a>
              </p>
            ))}
            <br />
          </>
        ) : []}
        <p>{status}</p>
        <p>
          {+(bytesReceived / 1024).toFixed(1)} kB&nbsp;
          of {+(totalSize / 1024).toFixed(1)} kB&nbsp;
          ({+(percentage).toFixed(1)}%)&nbsp;
          {+speed.toFixed(1)} kBps
        </p>
      </div>
    </div>
  );
}
