// ReceiverContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router';

import { Receiver } from './core';
import { ReceiverConfirm } from './ReceiverConfirm.jsx';
import { ReceiverProcessing } from './ReceiverProcessing.jsx';
import { ReceiverTransfer } from './ReceiverTransfer.jsx';

const STATE_CONFIRM = 'confirm';
const STATE_CONNECTING = 'connecting';
const STATE_RECEIVING = 'receiving';
const STATE_PROCESSING = 'processing';

export function ReceiverContainer() {
  // before transfer
  const [state, setState] = useState(STATE_CONFIRM);

  // during transfer
  const [fileinfo, setFileinfo] = useState([]);
  const [totalSize, setTotalSize] = useState(1);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const { code } = useParams(); // code is in URL fragment

  // on page load
  useEffect(() => {
    if (!/^([a-zA-Z0-9]{6,6})$/.test(code)) {
      // go to ShowError.jsx
      sessionStorage.setItem('error', `The drop code "${code}" is invalid.`);
      window.location.href = window.location.origin + "/#error";
      window.location.reload();
      return;
    }
  }, []);

  const onConfirm = async () => {
    // run exactly once on execution of JS within this component
    if (window.___DROPPR___.receiver === null) {
      window.___DROPPR___.receiver = 1; // incase double-click or smthn

      try {
        // display <></> until connected
        setState(STATE_CONNECTING);

        // will throw an error if the drop was not able to be claimed
        const res = await axios.post("/api/claim/" + code.toUpperCase());
        setFileinfo(res.data.fileinfo);

        // calculate total size
        let _totalSize = 0;
        res.data.fileinfo.forEach(file => {
          _totalSize += file.size;
        });
        setTotalSize(_totalSize);

        // will be used by ReceiverDownload.jsx
        sessionStorage.setItem('totalSize', JSON.stringify(_totalSize));

        // this is initialized before root.render(...) in index.js
        const fileStore = window.___DROPPR___.fileStore;
        const receiver = new Receiver(res.data.fileinfo, fileStore);
        window.___DROPPR___.receiver = receiver;
        let checkReceiverInterval = null;

        // a peer has connected
        receiver.addEventListener('connected', () => {
          setState(STATE_RECEIVING); // show ReceiverTransfer.jsx
          const startTime = Date.now(); // for checkReceiverInterval

          checkReceiverInterval = setInterval(() => {
            const _bytesReceived = receiver.bytesReceived;

            // calculate remaining seconds
            const _elapsedSeconds = (Date.now() - startTime) / 1000;
            const averageSPB = _elapsedSeconds / _bytesReceived; // SPB = seconds per byte
            const _remainingSeconds = (_totalSize - _bytesReceived) * averageSPB;

            setBytesReceived(_bytesReceived);
            setRemainingSeconds(Math.round(_remainingSeconds));
            setElapsedSeconds(_elapsedSeconds); // for ReceiverProcessing.jsx

            // for ReceiverDownload.jsx
            sessionStorage.setItem('elapsedSeconds', _elapsedSeconds);
          }, 250); // 250ms
        });

        // the connection was broken, but the receiver will attempt to reconnect
        receiver.addEventListener('disconnected', () => {
          // display <></> until connected
          setState(STATE_CONNECTING);
        });

        // the connection has failed and will not attempt to reconnect
        receiver.addEventListener('failed', () => {
          // go to ShowError.jsx
          sessionStorage.setItem('error', 'Something broke.');
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        });

        // all files have been downloaded and the receiver is now preparing the download information
        receiver.addEventListener('processing', async () => {
          setState(STATE_PROCESSING); // show ReceiverProcessing.jsx
          clearInterval(checkReceiverInterval); // stop checking the receiver
        });

        receiver.addEventListener('done', async () => {
          const download = JSON.stringify(receiver.downloaded);
          sessionStorage.setItem('download', download); // for ReceiverDownload.jsx

          // go to ReceiverDownload.jsx
          await axios.post('/api/cleanup');
          window.location.href = window.location.origin + "/#download";
          window.location.reload();
        });
      } catch (err) {
        // go to ShowError.jsx
        sessionStorage.setItem('error', err.toString())
        window.location.href = window.location.origin + "/#error";
        window.location.reload();
      }
    }
  }

  if (state === STATE_CONFIRM) {
    return <ReceiverConfirm code={code} onConfirm={onConfirm} />;
  }

  if (state === STATE_CONNECTING) {
    return <></>; // blank screen
  }

  if (state === STATE_PROCESSING) {
    return <ReceiverProcessing elapsedSeconds={elapsedSeconds} totalSize={totalSize} />;
  }

  // assume state === STATE_RECEIVING

  return (
    <ReceiverTransfer
      numFiles={fileinfo.length}
      bytesReceived={bytesReceived}
      totalSize={totalSize}
      remainingSeconds={remainingSeconds}
    />
  );
}