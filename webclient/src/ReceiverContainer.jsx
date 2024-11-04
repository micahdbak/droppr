// ReceiverContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router';

import { Receiver } from './core';
import { ReceiverConfirm } from './ReceiverConfirm.jsx';
import { ReceiverProcessing } from './ReceiverProcessing.jsx';
import { ReceiverTransfer } from './ReceiverTransfer.jsx';

const STATE_CONFIRM    = 'confirm';    // ReceiverConfirm.jsx
const STATE_CONNECTING = 'connecting'; // <></>
const STATE_RECEIVING  = 'receiving';  // ReceiverTransfer.jsx
const STATE_PROCESSING = 'processing'; // ReceiverProcessing.jsx (isCleanUp="false")
const STATE_CLEANUP    = 'cleanup';    // ReceiverProcessing.jsx (isCleanUp="true")

export function ReceiverContainer() {
  // before transfer
  const [state, setState] = useState(STATE_CONFIRM);

  // during transfer
  const [file, setFile] = useState({
    name: 'tmp.bin',
    size: 0,
    type: 'application/octet-stream',
    href: ''
  }); // fake file info
  const [bytesReceived, setBytesReceived] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // during processing
  const [processingProgress, setProcessingProgress] = useState(0);

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
        const _file = res.data.file;
        setFile(_file);

        // will be used by ReceiverSuccess.jsx
        sessionStorage.setItem('totalSize', _file.size);
        sessionStorage.setItem('fileName', _file.name);

        let receiver;

        try {
          receiver = new Receiver(_file); // will prompt for a file save location
        } catch (err) {
          // go to ShowError.jsx
          sessionStorage.setItem('error', 'Error in Receiver: ' + err.toString());
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
          return;
        }
        window.___DROPPR___.receiver = receiver;
        let checkReceiverInterval = null;

        // a peer has connected
        receiver.addEventListener('connected', () => {
          setState(STATE_RECEIVING); // show ReceiverTransfer.jsx
          const startTime = Date.now(); // for checkReceiverInterval

          checkReceiverInterval = setInterval(() => {
            setState((_state) => {
              if (_state === STATE_PROCESSING || _state === STATE_CLEANUP) {
                setProcessingProgress(receiver.processingProgress);
              } else {
                const _bytesReceived = receiver.bytesReceived;
  
                // calculate remaining seconds
                const _elapsedSeconds = (Date.now() - startTime) / 1000;
                const averageSPB = _elapsedSeconds / _bytesReceived; // SPB = seconds per byte
                const _remainingSeconds = (_file.size - _bytesReceived) * averageSPB;
  
                setBytesReceived(_bytesReceived);
                setRemainingSeconds(Math.round(_remainingSeconds));
                setElapsedSeconds(_elapsedSeconds); // for ReceiverProcessing.jsx
                
                // for Success.jsx
                sessionStorage.setItem('elapsedSeconds', _elapsedSeconds);
              }

              return _state;
            });
          }, 250); // 250ms
        });

        // the connection was broken, but the receiver will attempt to reconnect
        receiver.addEventListener('disconnected', () => {
          // display <></> until connected
          clearInterval(checkReceiverInterval);
          setState(STATE_CONNECTING);
        });

        // the connection has failed and will not attempt to reconnect
        receiver.addEventListener('aborted', (event) => {
          // go to ShowError.jsx
          sessionStorage.setItem('error', event.target.error.toString());
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        });

        // for non-Chromium-based browsers (uses IndexedDB)
        receiver.addEventListener('processing', async () => {
          // show ReceiverProcessing.jsx (isCleanUp="false")
          setState(STATE_PROCESSING);
        });

        // for non-Chromium-based browsers (uses IndexedDB)
        receiver.addEventListener('cleanup', async () => {
          // show ReceiverProcessing.jsx (isCleanUp="true")
          setState(STATE_CLEANUP);
        });

        // download is complete, display summary
        receiver.addEventListener('done', async () => {
          // go to Success.jsx
          clearInterval(checkReceiverInterval);
          
          receiver.close();
          receiver = null;
          delete window.___DROPPR___.receiver;

          await axios.post('/api/cleanup');
          
          sessionStorage.setItem('isDropper', 'false');
          window.location.href = window.location.origin + "/#success";
          window.location.reload();
        });
      } catch (err) {
        // go to ShowError.jsx
        sessionStorage.setItem('error', err.toString());
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

  if (state === STATE_PROCESSING || state === STATE_CLEANUP) {
    return (
      <ReceiverProcessing
        isCleanUp={state === STATE_CLEANUP}
        progress={processingProgress}
        fileName={file.name}
        elapsedSeconds={elapsedSeconds}
        totalSize={file.size}
      />
    );
  }

  // assume state === STATE_RECEIVING

  return (
    <ReceiverTransfer
      fileName={file.name}
      bytesReceived={bytesReceived}
      totalSize={file.size}
      remainingSeconds={remainingSeconds}
    />
  );
}