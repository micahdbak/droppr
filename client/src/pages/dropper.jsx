// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useState, useEffect } from 'react';
import * as droppr from '../utils';
import { Header, Footer, FileComponent } from '../components/index.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Dropper() {
  const [fileList, setFileList] = useState([]);
  const [fileInfoList, setFileInfoList] = useState([]);
  const [file, setFile] = useState(null);
  const [bytes, setBytes] = useState(0);
  const [lastBytes, setLastBytes] = useState(0);
  //const [isDropping, setIsDropping] = useState(false);
  const [status, setStatus] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [transferid, setTransferid] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);
  const [dropped, setDropped] = useState(false); //when drop button is pressed
  const [totalSize, setTotalSize] = useState(0);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // handling manually setting files
  const handleFiles = (event) => {
    let total = 0;
    const newFiles = event.target.files;
    for (let i = 0; i < newFiles.length; i++) {
      const newFile = newFiles[i];
      if (newFile) {
        const fileInfo = {
          name: newFile.name,
          size: newFile.size,
          type: newFile.type
        };
        setFileInfoList((prevFileInfoList) => [...prevFileInfoList, fileInfo]);
        setFileList((prevFileList) => [...prevFileList, file]);
        total += parseInt(fileInfo.size, 10);
        setFile(newFile);
      }
    }
    setTotalSize(total + totalSize);

    if (fileList.length > 0) {
      setStatus('registering');
    }
  };

  // handling dragged files
  const handleDrop = (event) => {
    event.preventDefault(); //this is literally the only difference between handleFile

    let total = 0;

    const newFiles = event.dataTransfer.files;
    for (let i = 0; i < newFiles.length; i++) {
      const newFile = newFiles[i];

      if (newFile) {
        const fileInfo = {
          name: newFile.name,
          size: newFile.size,
          type: newFile.type
        };
        setFileInfoList((prevFileInfoList) => [...prevFileInfoList, fileInfo]);
        setFileList((prevFileList) => [...prevFileList, file]);
        total += parseInt(fileInfo.size, 10);
        setFile(newFile);
      }
    }
    setTotalSize(total + totalSize);
    if (fileList.length > 0) {
      setStatus('registering');
    }
  };

  const handleDroppr = (event) => {
    //drops all files
    //droppr.drop(_file, (update) => {
    setDropped(true);
  };

  // handle dragging
  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setIsDragging(false);
  };

  // update statuses (typically every 100ms)
  useEffect(() => {
    if (dropped) {
      const percentage = ((100 * bytes) / totalSize).toFixed(1);
      const speed = ((bytes - lastBytes) / statusInterval / 1000).toFixed(1); // MBps

      if (bytes === 0) {
        setDownloadStatus('');
      } else {
        setDownloadStatus(
          `Dropped ${(bytes / MB).toFixed(2)} of ${(totalSize / MB).toFixed(2)} MB (${speed} MBps) (${percentage}%).`
        );
      }
      setLastBytes(bytes);
    }
  }, [bytes, fileInfoList, dropped]);

  // on page load
  useEffect(() => {
    const checkStatusInterval = setInterval(() => {
      setBytes(100); //MANUALLY SETTING BYTES
      //setBytes(droppr.getBytes());
    }, statusInterval);

    return () => {
      clearInterval(checkStatusInterval);
    };
  }, []);

  return (
    <div>
      <Header />
      <div className="flex items-center justify-center my-10">
        <p className="text-3xl font-light">Simply Transfer</p>
      </div>

      {/* Drop-zone */}
      {dropped === false ? (
        <div
          className={`bg-slate-100 p-36 mx-auto w-3/4 h-3/4 my-12 rounded-lg flex items-center justify-center border border-black border-dashed ${isDragging ? 'border-blue-500 border-2' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="font-medium">Drop your files</p>
            <p className="mb-1">or</p>
            <input
              type="file"
              onChange={handleFiles}
              className="hidden"
              multiple
            />
            <button
              className="bg-slate-200 px-4 py-2 rounded-lg"
              onClick={() =>
                document.querySelector('input[type="file"]').click()
              }
            >
              Browse Files
            </button>

            <br></br>

            <input
              onChange={(e) => {
                setFileList(e.target.files);
              }}
              className="hidden"
              type="file"
              multiple
            />
            <button
              className="bg-slate-200 px-4 py-2 rounded-lg"
              onClick={handleDroppr}
            >
              Drop
            </button>
            <p className="font-medium"> {fileList.length} file(s) selected</p>
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-nowrap mx-auto w-3/4 h-3/4 items-center justify-center">
          <br />
          <br />
          <br />
          <br />
          <img src="/file.png" width="48px" height="48px" />
          <br />

          <div className="font-semibold">
            {fileInfoList.map((fileInfo, index) => (
              <FileComponent index={index + 1} fileInfo={fileInfo} />
            ))}
          </div>

          {/*<p className='font-semibold'>{fileInfoList[0].name}</p> */}
          <br />
          <p>Total size: {(totalSize / 1024).toFixed(1)} kB</p>
          <br />
          {transferid >= 0 ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={`${window.location.origin}/?id=${transferid}`}
                readOnly
                className="px-2 py-1 border rounded w-full text-sm"
                style={{ width: '17vw' }}
              />
              <button
                onClick={() =>
                  copyToClipboard(`${window.location.origin}/?id=${transferid}`)
                }
              >
                <FontAwesomeIcon icon={hasCopied ? faCheck : faCopy} />
              </button>
            </div>
          ) : (
            []
          )}
          <br />
          <p className="text-slate-500">{status}</p>
          <p className="text-slate-500">{downloadStatus}</p>
        </div>
      )}
      <Footer />
    </div>
  );
}
