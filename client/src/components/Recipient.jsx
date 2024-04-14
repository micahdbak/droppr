// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useEffect, useState } from 'react';

import { FileContainer, FileItem } from './index.js';
import * as models from '../models/index.js';

const _intervalRate = 1000; // 1s

export function Recipient(props) {
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

  const files = [...fileinfo, ...download];

  if (!shouldReceive) {
    return (
      <div
        className={
          'w-full h-full ' +
          'flex flex-col items-center justify-center ' +
          'text-center'
        }
      >
        <p className="text-base text-slate-800 mb-2">Drop identifier is</p>
        <p className="text-sm font-mono rounded px-2 py-1 mb-8 bg-blue-100">{id}</p>
        <p className="text-base text-slate-600 mb-2">Look right?</p>
        <button
          className="bg-blue-400 text-white px-4 py-2 rounded-lg"
          onClick={() => setShouldReceive(true)}
        >
          Receive Files
        </button>
      </div>
    );
  }

  return (
    <div
      className={
        'w-full h-full ' +
        'flex flex-col items-center justify-center ' +
        'text-center'
      }
    >
      <p className="font-bold text-lg text-slate-600 mb-4">Your Files</p>
      <FileContainer>
        {files.map((file) => (
          <FileItem
            name={file.name}
            size={file.size}
            href={file.href}
            disabled={file.href === undefined}
          />
        ))}
      </FileContainer>
      <br />
      <p>{status}</p>
      <p>
        {+(bytesReceived / 1024).toFixed(1)} kB&nbsp;
        of {+(totalSize / 1024).toFixed(1)} kB&nbsp;
        ({+(percentage).toFixed(1)}%)&nbsp;
        {+speed.toFixed(1)} kBps
      </p>
    </div>
  );
}
