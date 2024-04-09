// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useState } from 'react';

import { drop, receive } from './utils/index.js';

export function Test() {
  const [download, setDownload] = useState({});
  const [files, setFiles] = useState([]);
  const [fileinfo, setFileinfo] = useState({});
  const [id, setId] = useState('');
  const [isDropper, setIsDropper] = useState(true);
  const [status, setStatus] = useState('waiting');
  const [summary, setSummary] = useState({});

  let startDropper = () => {
    // ready the drop
    drop(files, (_status, _data) => {
      setStatus(_status);

      switch (_status) {
        case 'fileinfo':
          setFileinfo(_data);

          break;

        case 'registered':
          setId(_data);

          break;

        case 'offsetchanged':
          setSummary((_summary) => {
            _summary[_data.label] = _data.offset;

            return _summary;
          });

          break;

        default:
          // pass

          break;
      }
    });
  };

  let startRecipient = () => {
    // prepare to receive
    receive(id, (_status, _data) => {
      setStatus(_status);

      switch (_status) {
        case 'fileinfo':
          setFileinfo((_fileinfo) => {
            _fileinfo[_data.label] = {
              name: _data.name,
              size: _data.size,
              type: _data.type
            };

            return _fileinfo;
          });

          break;

        case 'offsetchanged':
          setSummary((_summary) => {
            _summary[_data.label] = _data.offset;

            return _summary;
          });

          break;

        case 'download':
          console.log(`Got download ${JSON.stringify(_data)}`);
          setDownload((_download) => {
            _download[_data.label] = {
              name: _data.name,
              size: _data.size,
              type: _data.type,
              href: _data.href
            };

            return _download;
          });

        default:
          // pass

          break;
      }
    });
  };

  let handleFileInput = (event) => {
    setFiles(Array.from(event.target.files));
    setStatus('ready');
  };

  let handleIdInput = (event) => {
    setId(event.target.value);
  };

  return (
    <>
      {/* header */}
      <h1>droppr - Test</h1>
      <p>(Acting as {isDropper ? 'dropper' : 'recipient'}.)</p>
      {status === 'waiting' ? (
        <>
          <button onClick={() => setIsDropper(!isDropper)}>Switch</button>
          <br />
        </>
      ) : (
        []
      )}
      {/* display menu */}
      {isDropper ? (
        <>
          {status === 'waiting' ? (
            <input type="file" onChange={handleFileInput} multiple />
          ) : (
            []
          )}
          {status === 'ready' && files.length ? (
            <button onClick={startDropper}>Register</button>
          ) : (
            []
          )}
          {id !== '' ? <p>Dropping: {id}</p> : []}
        </>
      ) : status === 'waiting' ? (
        <>
          <input type="text" onChange={handleIdInput} />
          <button onClick={startRecipient}>Receive</button>
        </>
      ) : (
        <p>Receiving: {id}</p>
      )}
      <hr />
      {/* display current status */}
      <p>Status: {status}</p>
      <hr />
      {/* display all files or file infos */}
      <p>Files:</p>
      {files.length
        ? files.map((file) => {
            return <p>{file.name}, {file.size}, {file.type}</p>;
          })
        : Object.keys(fileinfo).length
            ? Object.keys(fileinfo).map((label) => {
                const file = fileinfo[label];

                return <p>{file.name}, {file.size}, {file.type}</p>;
              })
            : []}
      <hr />
      {/* display all available downloads */}
      <p>Download:</p>
      {Object.keys(download).length
        ? Object.keys(download).map((label) => {
            const file = download[label];

            return (
              <p>
                {file.name}, {file.size}, {file.type},
                <a href={file.href} download={file.name}>
                  Download
                </a>
              </p>
            );
          })
        : []}
      <hr />
      {/* display all summaries */}
      <p>Offsets:</p>
      {Object.keys(summary).length
        ? Object.keys(summary).map((label) => {
            return (
              <p>
                {fileinfo[label].name}: offset is {summary[label]}
              </p>
            );
          })
        : []}
    </>
  );
}
