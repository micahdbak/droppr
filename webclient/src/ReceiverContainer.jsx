// ReceiverContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router';

import { Receiver, errorToString } from './core';
import { ReceiverConfirm } from './ReceiverConfirm.jsx';
import { ReceiverProcessing } from './ReceiverProcessing.jsx';
import { ReceiverTransfer } from './ReceiverTransfer.jsx';

const STATE_CONFIRM    = 0;
const STATE_CONNECTING = 1;
const STATE_TRANSFER   = 2;
const STATE_PROCESSING = 3;
const STATE_CLEANUP    = 4;

export function ReceiverContainer() {
  const [bytesReceived, setBytesReceived] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [file, setFile] = useState({
    name: 'tmp.bin',
    size: 0,
    type: 'application/octet-stream',
    href: ''
  });
  const [processingProgress, setProcessingProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [state, setState] = useState(STATE_CONFIRM);

  const { code } = useParams(); // code is in URL fragment

  // on page load
  useEffect(() => {
    if (!/^([a-zA-Z0-9]{6,6})$/.test(code)) {
      // go to Main.jsx
      window.location.href = window.location.origin + "/#";
      window.location.reload();
      return;
    }
  }, []);

  const onConfirm = async () => {
    // run exactly once on execution of JS within this component
    if (window.___DROPPR___.receiver === null) {
      window.___DROPPR___.receiver = 1; // incase double-click or smthn

      try {
        setState(STATE_CONNECTING);

        // will throw an error if the drop was not able to be claimed
        const res = await axios.post("/api/claim/" + code.toUpperCase());
        const _file = res.data.file;
        setFile(_file);

        // will be used by Success.jsx
        sessionStorage.setItem('isDropper', 'false');
        sessionStorage.setItem('totalSize', _file.size);
        sessionStorage.setItem('fileName', _file.name);

        const receiver = new Receiver(_file); // will prompt for a file save location
        window.___DROPPR___.receiver = receiver;
        let checkReceiverInterval = null;

        receiver.addEventListener('error', () => {
          sessionStorage.setItem('error', errorToString(receiver.error));

          // go to ShowError.jsx
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        });

        receiver.addEventListener('connected', () => {
          setState(STATE_TRANSFER); // show ReceiverTransfer.jsx
          const startTime = Date.now(); // for checkReceiverInterval

          checkReceiverInterval = setInterval(() => {
            setState((_state) => {
              // in this case, only update the processingProgress
              if (_state === STATE_PROCESSING || _state === STATE_CLEANUP) {
                setProcessingProgress(receiver.processingProgress);
              } else {
                // otherwise, update bytesReceived, remainingSeconds, elapsedSeconds
                const _bytesReceived = receiver.bytesReceived;
                setBytesReceived(_bytesReceived);
  
                const _elapsedSeconds = (Date.now() - startTime) / 1000;
                setElapsedSeconds(Math.round(_elapsedSeconds));

                const avgSecondsPerByte = _elapsedSeconds / _bytesReceived;
                const _remainingSeconds = (_file.size - _bytesReceived) * avgSecondsPerByte;
                setRemainingSeconds(Math.round(_remainingSeconds));
                
                // for Success.jsx
                sessionStorage.setItem('elapsedSeconds', Math.round(_elapsedSeconds));
              }

              return _state;
            });
          }, 250); // 250ms
        });

        receiver.addEventListener('disconnected', () => {
          clearInterval(checkReceiverInterval);
          setState(STATE_CONNECTING);
        });

        receiver.addEventListener('processing', async () => {
          setState(STATE_PROCESSING);
        });

        receiver.addEventListener('cleanup', async () => {
          setState(STATE_CLEANUP);
        });

        receiver.addEventListener('done', async () => {
          clearInterval(checkReceiverInterval);
          await axios.post('/api/cleanup');

          // go to Success.jsx
          window.location.href = window.location.origin + "/#success";
          window.location.reload();
        });
      } catch (err) {
        sessionStorage.setItem('error', errorToString(err));

        // go to ShowError.jsx
        window.location.href = window.location.origin + "/#error";
        window.location.reload();
      }
    }
  }

  switch (state) {
    case STATE_CONFIRM:
      return <ReceiverConfirm code={code} onConfirm={onConfirm} />;

    case STATE_PROCESSING:
    case STATE_CLEANUP:
      return (
        <ReceiverProcessing
          elapsedSeconds={elapsedSeconds}
          fileName={file.name}
          isCleanUp={state === STATE_CLEANUP}
          progress={processingProgress}
          totalSize={file.size}
        />
      );

    case STATE_TRANSFER:
      return (
        <ReceiverTransfer
          bytesReceived={bytesReceived}
          fileName={file.name}
          remainingSeconds={remainingSeconds}
          totalSize={file.size}
        />
      );
    
    default: // STATE_CONNECTING
      return <></>;
  }
}
