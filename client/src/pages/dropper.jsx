import React, { useState, useEffect } from 'react';
import * as droppr from '../interface';
import { Header, Footer } from '../components/index.js';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

const statusInterval = 100; // 100ms
const MB = 1000 * 1024;

export function Dropper() {
  const [file, setFile] = useState(null);
  const [fileInfo, setFileInfo] = useState({});
  const [bytes, setBytes] = useState(0);
  const [lastBytes, setLastBytes] = useState(0);
  const [isDropping, setIsDropping] = useState(false);
  const [status, setStatus] = useState('');
  const [downloadStatus, setDownloadStatus] = useState('');
  const [transferid, setTransferid] = useState(-1);
  const [isDragging, setIsDragging] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

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
      setStatus('registering');
      setIsDropping(true);

      droppr.drop(newFile, (update) => {
        // if it provides the id attribute
        if (update.id) {
          setTransferid(update.id);
        }

        if (update.status === 'connected') {
          setTransferid(-1);
        }

        // nak
        if (update.status === 'complete') {
          setIsDropping(false);
          setDownloadStatus('');
        }

        // update status based on update
        setStatus(update.status);
      });
    }
  };

  // handling dropping files
  const handleDrop = (event) => {
    event.preventDefault();

    let _file = file;

    if (file === null) {
      const droppedFile = event.dataTransfer.files[0];

      setFile(droppedFile);
      _file = droppedFile;

      setFileInfo({
        name: droppedFile.name,
        size: droppedFile.size,
        type: droppedFile.type,
      });
    }

    if (_file) {
      setStatus('registering');
      setIsDropping(true);

      droppr.drop(_file, (update) => {
        // if it provides the id attribute
        if (update.id) {
          setTransferid(update.id);
        }

        if (update.status === 'connected') {
          setTransferid(-1);
        }

        // nak
        if (update.status === 'complete') {
          setIsDropping(false);
          setDownloadStatus('');
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
        setDownloadStatus('');
      } else {
        setDownloadStatus(
          `Dropped ${(bytes / MB).toFixed(2)} of ${(fileInfo.size / MB).toFixed(2)} MB (${speed} MBps) (${percentage}%).`,
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
        <p className="text-3xl font-light">A new perspective for file transfer.</p>
      </div>

      {/* Drop-zone */}
      {file === null ? (
        <div
          className={`bg-slate-100 p-36 mx-auto w-3/4 h-3/4 my-12 rounded-lg flex items-center justify-center border border-black border-dashed ${isDragging ? 'border-blue-500 border-2' : ''}`}
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
      ) : (
        <div className='flex flex-col flex-nowrap mx-auto w-3/4 h-3/4 items-center justify-center'>
          <br />
          <br />
          <br />
          <br />
          <img src='/file.png' width='48px' height='48px' />
          <br />
          <p className='font-semibold'>{fileInfo.name}</p>
          <p>{(fileInfo.size / 1024).toFixed(1)} kB</p>
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
            <button onClick={() => copyToClipboard(`${window.location.origin}/?id=${transferid}`)}>
              <FontAwesomeIcon icon={hasCopied ? faCheck : faCopy} />
            </button>
          </div>     
        ) : []}
          <br />
          <p className='text-slate-500'>{status}</p>
          <p className='text-slate-500'>{downloadStatus}</p>
        </div>
      )}
      <Footer/>
    </div>
  );
}
