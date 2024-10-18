// ReceiverContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router';

import { Waiting } from './Waiting.jsx';
import { ReceiverConfirmation } from './ReceiverConfirmation.jsx';
import { Receiver } from './core';
import { Page, Header, LoadingBar } from './components';
import { bytesToHRString } from './utils.js';

export function ReceiverContainer() {
  // before transfer
  const [shouldReceive, setShouldReceive] = useState(false);
  const [isWaiting, setIsWaiting] = useState(true);

  // during transfer
  const [fileinfo, setFileinfo] = useState([]);
  const [totalSize, setTotalSize] = useState(1);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const { code } = useParams();

  // on page load
  useEffect(() => {
    console.log('test');
    
    if (!/^([a-zA-Z0-9]{6,6})$/.test(code)) {
      sessionStorage.setItem('error', `The drop code "${code}" is invalid.`);
      window.location.replace(window.location.origin + "/#error");
      return;
    }
  }, []);

  const onConfirm = async () => {
    try {
      setShouldReceive(true);
      // will throw an error if the drop was not able to be claimed
      const res = await axios.post("/api/claim/" + code.toUpperCase());
      setFileinfo(res.data.fileinfo);
      setIsWaiting(false); // stop displaying waiting screen

      const _receiver = new Receiver(res.data.fileinfo);

      _receiver.addEventListener('connected', () => {
        const startTime = Date.now();

        setInterval(() => {
          const _totalSize = _receiver.totalSize;
          const _bytesReceived = _receiver.bytesReceived;

          const secondsElapsed = (Date.now() - startTime) / 1000;
          const averageSPB = secondsElapsed / _bytesReceived; // SPB = seconds per byte
          const _remainingSeconds = (_totalSize - _bytesReceived) * averageSPB;

          setTotalSize(_totalSize);
          setBytesReceived(_bytesReceived);
          setRemainingSeconds(Math.round(_remainingSeconds));
        }, 250);
      });
      _receiver.addEventListener('disconnected', () => { /* pass */ });
      _receiver.addEventListener('processing', async () => {
        setIsWaiting(true);
      });
      _receiver.addEventListener('done', async () => {
        const _download = JSON.stringify(_receiver.downloaded);
        sessionStorage.setItem('download', _download);

        await axios.post('/api/cleanup');
        window.location.replace(window.location.origin + "/#download"); // force refresh
      });
      _receiver.addEventListener('failed', () => {
        sessionStorage.setItem('error', 'Something broke.');
        window.location.replace(window.location.origin + "/#error"); // force refresh
      });
    } catch (err) {
      sessionStorage.setItem('error', err.toString())
      window.location.replace(window.location.origin + "/#error");
    }
  }

  if (!shouldReceive) {
    return <ReceiverConfirmation code={code} onConfirm={onConfirm} />;
  }

  // display waiting screen if waiting for a promise
  if (isWaiting) {
    return <Waiting />;
  }

  const percentTransferred = (100 * bytesReceived / totalSize).toFixed(1);
  const fileCount = fileinfo.length;

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-start w-72">
        <img src="drop.gif" />
        <p className="text-2xl mb-2">Receiving {fileCount} {fileCount > 1 ? "files" : "file"}</p>
        <p className="text-base">{percentTransferred}% done</p>
        <LoadingBar bytes={bytesReceived} total={totalSize} />
        <p className="text-sm text-gray-500 mb-3">{bytesToHRString(bytesReceived)} of {bytesToHRString(totalSize)}</p>
        <p className="text-base">{remainingSeconds} {remainingSeconds === 1 ? "second" : "seconds"} remaining</p>
      </div>
    </Page>
  );
}