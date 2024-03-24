import React, { useState, useEffect } from 'react';
import * as droppr from '../interface';
import { Header } from '../components/index';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Dropper() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState({});
  const [bytes, setBytes] = useState(0);
  const [lastBytes, setLastBytes] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [status, setStatus] = useState('');
  const [transferid, setTransferid] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // setting file info
  const handleFile = (event) => {
    const newFile = event.target.files[0];
    if (newFile) {
      setFileInfo({
        name: newFile.name,
        size: newFile.size,
        type: newFile.type,
      });
      setFile(newFile);
      setStatus('File is ready to drop.');
    }
  };

  // handling dropping files
  const handleDrop = (event) => {
    event.preventDefault();
    setIsDropping(false);

    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setStatus('File is dropped.');

      droppr.drop(droppedFile, (update) => {
        setFile(null);

        // if it provides the id attribute
        if (update.id) {
          setTransferid(update.id);
        }

        // update status based on update
        setStatus(update.status);
      });

    }
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
    if (isDropping) {
      const percentage = ((100 * bytes) / fileInfo.size).toFixed(1);
      const speed = ((bytes - lastBytes) / statusInterval / 1000).toFixed(1); // MBps

      if (bytes === 0) {
        setStatus('Waiting...');
      } else {
        setStatus(
          `Dropped ${(bytes / MB).toFixed(1)} of ${(fileInfo.size / MB).toFixed(1)} MBs (${speed} MBps) (${percentage}%).`,
        );
      }
      setLastBytes(bytes);
    }
  }, [bytes, fileInfo, isDropping]);

  // on page load
  useEffect(() => {
    const checkStatusInterval = setInterval(() => {
      setBytes(droppr.getBytes());
    }, statusInterval);

    return () => {
      clearInterval(checkStatusInterval);
    };
  }, []);

  return (
    <div>
      <Header />
      <div className="flex items-center justify-center my-10">
        <p className="text-4xl font-semibold">Drop Files</p>
      </div>

      {/* Drop-zone */}
      <div
        className={`bg-slate-100 p-36 mx-64 my-12 rounded-lg flex items-center justify-center border border-black border-dashed ${isDragging ? 'border-blue-500 border-2' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="font-medium">Drop your files to upload</p>
          <p className="mb-1">or</p>
          <input type="file" onChange={handleFile} className="hidden" />
          <button
            className="bg-slate-200 px-4 py-2 rounded-lg"
            onClick={() => document.querySelector('input[type="file"]').click()}
          >
            Browse Files
          </button>
        </div>
      </div>

      {/* Display area */}
      <div>{status}</div>
    </div>
  );
}
