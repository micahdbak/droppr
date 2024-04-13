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
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('waiting');
  const [totalSize, setTotalSize] = useState(0);

  useEffect(() => {
    let _recipient = recipient;

    if (_recipient === null) {
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
  }, [recipient]);

  useEffect(() => {
    if (totalSize > 0 && bytesReceived - lastBytesReceived > 0) {
      setPercentage((bytesReceived / totalSize) * 100);
      setSpeed((bytesReceived - lastBytesReceived) / _intervalRate); // kBps
      setLastBytesReceived(bytesReceived);
    }
  }, [bytesReceived, lastBytesReceived, totalSize]);

  return (
    <div className="fixed top-8 right-8 bottom-8 left-8">
      <div
        className={
          'w-full h-full ' +
          'flex flex-col items-center justify-center ' +
          'text-center'
        }
      >
        <p>Pending Files:</p>
        {fileinfo.map((file) => <p>{file.name}, {file.size}, {file.type}</p>)}
        <p>Downloads:</p>
        {download.map((file) => (
          <p>
            {file.name}, {file.size}, {file.type}&nbsp;
            <a className='text-blue-400' href={file.href} download={file.name}>Download</a>
          </p>
        ))}
        <br />
        <p>{status}</p>
        <p>{bytesReceived} / {totalSize} ({percentage}%) - {speed} kBps</p>
      </div>
    </div>
  );
}
