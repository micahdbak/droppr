// ReceiverContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router';

import { Receiver } from './core';
import { Download } from './Download.jsx';

export function ReceiverContainer() {
  const [isWaiting, setIsWaiting] = useState(true);
  const [state, setState] = useState('waiting');
  const [fileinfo, setFileinfo] = useState([]);
  const [download, setDownload] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [bytesReceived, setBytesReceived] = useState(0);

  const { dropId } = useParams();

  useEffect(() => {
    const claimDrop = async (dropId) => {
      try {
        // will throw an error if the drop was not able to be claimed
        await axios.post("/api/claim/" + dropId.toUpperCase());
        setIsWaiting(false); // stop displaying waiting screen

        const _receiver = new Receiver();

        const checkInterval = setInterval(() => {
          setFileinfo(_receiver.fileinfo);
          setDownload(_receiver.download);
          setTotalSize(_receiver.totalSize);
          setBytesReceived(_receiver.bytesReceived);
        }, 1000);

        _receiver.addEventListener('connected', () => { setState('connected'); });
        _receiver.addEventListener('disconnected', () => { setState('disconnected'); });
        _receiver.addEventListener('done', async () => {
          clearInterval(checkInterval);

          const _download = JSON.stringify(_receiver.download);
          sessionStorage.setItem('download', _download);

          await axios.post('/api/cleanup');
          window.location.replace(window.location.origin + "/#download"); // force refresh
        });
      } catch (err) {
        sessionStorage.setItem('error', err.toString())
        window.location.replace(window.location.origin + "/#error");
      }
    }

    if (!/^([a-zA-Z0-9]{6,6})$/.test(dropId)) {
      sessionStorage.setItem('error', `The drop ID "${dropId}" is invalid.`);
      window.location.replace(window.location.origin + "/#error");
      return;
    }

    claimDrop(dropId);
  }, []);

  // display waiting screen if waiting for a promise
  if (isWaiting) {
    return <p>Waiting...</p>;
  }

  // if got done state, display download screen
  if (state === 'done') {
    return <Download download={download} />;
  }

  return (
    <>
      <p>State: {state}</p>
      <p>{JSON.stringify(fileinfo)}</p>
      <p>{JSON.stringify(download)}</p>
      <p>{bytesReceived} / {totalSize}</p>
    </>
  );
}