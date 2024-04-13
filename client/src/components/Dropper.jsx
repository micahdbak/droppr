// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

import * as models from '../models/index.js';

const _intervalRate = 1000; // 1s

export function Dropper() {
  const [bytesSent, setBytesSent] = useState(0);
  const [dropper, setDropper] = useState(null);
  const [files, setFiles] = useState([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [id, setId] = useState('');
  const [recipientLink, setRecipientLink] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [lastBytesSent, setLastBytesSent] = useState(0);
  const [percentage, setPercentage] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [status, setStatus] = useState('waiting');
  const [totalSize, setTotalSize] = useState(0);

  function handleFileInput(event) {
    setFiles(Array.from(event.target.files));
  }

  function handleDrop(event) {
    event.preventDefault();

    setFiles(Array.from(event.dataTransfer.files));
  }

  function handleDragOver(event) {
    event.preventDefault();
  }

  function handleDragEnter(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  async function copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      console.error(
        'Dropper (Component): Error in copyToClipboard: ' + err.toString()
      );
    }
  }

  useEffect(() => {
    let _dropper = dropper;

    if (_dropper === null && files.length !== 0) {
      _dropper = new models.Dropper(files);

      _dropper.addEventListener('idchanged', (event) => {
        setStatus('registered');
        setId(event.target.id);
      });

      _dropper.addEventListener('connected', () => {
        setStatus('connected');
      });

      _dropper.addEventListener('disconnected', () => {
        setStatus('disconnected');
      });

      setTotalSize(_dropper.totalSize);
      setDropper(_dropper);
    }

    if (_dropper !== null) {
      const interval = setInterval(
        (d) => {
          setBytesSent(d.bytesSent);
        },
        _intervalRate,
        _dropper
      );

      return () => {
        clearInterval(interval);
      };
    }
  }, [files, dropper]);

  useEffect(() => {
    setRecipientLink(`${window.location.origin}/?id=${id}`);
  }, [id]);

  useEffect(() => {
    if (totalSize > 0 && bytesSent - lastBytesSent > 0) {
      setPercentage((bytesSent / totalSize) * 100);
      setSpeed((bytesSent - lastBytesSent) / _intervalRate); // kBps
      setLastBytesSent(bytesSent);
    }
  }, [bytesSent, lastBytesSent, totalSize]);

  if (files.length === 0) {
    return (
      <div
        className={
          'w-full h-full ' +
          'flex flex-col items-center justify-center ' +
          (isDragging
            ? 'bg-blue-100 border-2 border-blue-500 '
            : 'bg-slate-100 border border-black ') +
          'border-dashed rounded-xl text-center'
        }
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <p className="font-bold text-slate-700">Drop Files</p>
        <p className="mb-1 text-slate-600">or</p>
        <input
          type="file"
          onChange={handleFileInput}
          className="hidden"
          multiple
        />
        <button
          className="bg-blue-400 text-white px-4 py-2 rounded-lg"
          onClick={() => document.querySelector('input[type="file"]').click()}
        >
          Browse Files
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
      {files.map((file) => <p>{file.name}, {file.size}, {file.type}</p>)}
      <br />
      {id !== '' && bytesSent === 0 ? (
        <div className="flex flex-row items-center justify-center space-x-2 w-full">
          <input
            type="text"
            className="px-2 py-1 border border-slate-400 rounded font-mono text-sm bg-slate-100"
            value={recipientLink}
            style={{ width: `${recipientLink.length}ch` }}
            readOnly
          />
          <button onClick={() => copyToClipboard(recipientLink)}>
            <FontAwesomeIcon icon={hasCopied ? faCheck : faCopy} />
          </button>
        </div>
      ) : (
        <>
          <p>{status}</p>
          <p>{bytesSent} / {totalSize} ({percentage}%) - {speed} kBps</p>
        </>
      )}
    </div>
  );
}
