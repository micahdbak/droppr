// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useState } from 'react';

import { drop, receive } from './utils/index.js';

export function Test() {
  const [isDropper, setIsDropper] = useState(true);
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [id, setId] = useState('');
  const [download, setDownload] = useState(null);

  let handleFile = (event) => {
    setFile(event.target.files[0]);
    setStatus('ready');
  };

  let handleId = (event) => {
    setId(event.target.value);
  };

  let handleDrop = () => {
    // ready the drop
    drop([file], (_status, _data) => {
      switch (_status) {
        case 'registered':
          setStatus('registered');
          setId(_data);

          break;

        case 'open':
          setStatus('connected');

          break;

        case 'close':
          if (status !== 'done') {
            setStatus('disconnected');
          }

          break;

        case 'bytes':
          setStatus(`bytes sent: ${_data}`);

          break;

        case 'done':
          setStatus('done');

          break;

        default:
          setStatus(_status);

          break;
      }
    });
  };

  let handleReceive = () => {
    // prepare to receive
    receive(id, (_status, _data) => {
      switch (_status) {
        case 'open':
          setStatus('connected');

          break;

        case 'fileinfo':
          setFile(_data);

          break;

        case 'close':
          setStatus('disconnected');

        case 'bytes':
          setStatus(`bytes got: ${_data}`);

          break;

        case 'download':
          setDownload(_data);
          setStatus('done');

        default:
          setStatus(_status);

          break;
      }
    });
  };

  return (
    <>
      <h1>droppr - Test</h1>
      <p>(Acting as {isDropper ? 'dropper' : 'recipient'}.)</p>
      <button onClick={() => setIsDropper(!isDropper)}>Switch</button>
      <hr />
      {file !== null ? (
        <>
          <p>Name: {file.name}</p>
          <p>Size: {file.size}</p>
          <p>Type: {file.type}</p>
        </>
      ) : (
        []
      )}
      {isDropper ? (
        <>
          {status === 'waiting' ? (
            <input type="file" onChange={handleFile} />
          ) : (
            []
          )}
          {status === 'ready' && typeof file === 'object' ? (
            <button onClick={handleDrop}>Register</button>
          ) : (
            []
          )}
          {id !== '' ? <p>Drop identifier: {id}</p> : []}
        </>
      ) : status === 'waiting' ? (
        <>
          <input type="text" onChange={handleId} />
          <button onClick={handleReceive}>Receive</button>
        </>
      ) : (
        []
      )}
      <hr />
      {status}
      {download !== null ? (
        <>
          <hr />
          <a href={download.href} download={download.name}>
            Download {download.name}.
          </a>
        </>
      ) : (
        []
      )}
    </>
  );
}
