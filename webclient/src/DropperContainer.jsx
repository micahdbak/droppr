// DropperContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Dropper, errorToString } from './core';
import { DropperWaiting } from './DropperWaiting.jsx';
import { DropperTransfer } from './DropperTransfer.jsx';
import { SpinningWheel } from './SpinningWheel.jsx';

const STATE_WAITING    = 0;
const STATE_CONNECTING = 1;
const STATE_TRANSFER   = 2;

/**
 * @param {object} props
 * @param {string} props.code
 * @param {File} props.file
 */
export function DropperContainer(props) {
  const { code, file } = props;

  const [bytesSent, setBytesSent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [state, setState] = useState(STATE_WAITING);

  useEffect(() => {
    if (window.___DROPPR___.dropper === null) {
      // for Success.jsx
      sessionStorage.setItem('isDropper', 'true');
      sessionStorage.setItem('totalSize', file.size.toString());
      sessionStorage.setItem('fileName', file.name);

      try {
        // create a new Dropper object
        const dropper = new Dropper(file);
        window.___DROPPR___.dropper = dropper;
        let checkDropperInterval = null;

        dropper.addEventListener('error', () => {
          sessionStorage.setItem('error', errorToString(dropper.error));

          // go to ShowError.jsx
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        });

        dropper.addEventListener('connected', () => {
          setState(STATE_TRANSFER);
          const startTime = Date.now(); // for checkDropperInterval
    
          checkDropperInterval = setInterval(() => {
            const _bytesSent = dropper.bytesSent;
            setBytesSent(_bytesSent);
    
            const msElapsed = Date.now() - startTime;
            const elapsedSeconds = msElapsed / 1000;
            const avgSecondsPerByte = elapsedSeconds / _bytesSent;
            setRemainingSeconds(Math.ceil((file.size - _bytesSent) * avgSecondsPerByte));

            // for Success.jsx
            sessionStorage.setItem('elapsedSeconds', JSON.stringify(Math.ceil(elapsedSeconds)));
          }, 100); // 100ms
        });

        dropper.addEventListener('disconnected', () => {
          clearInterval(checkDropperInterval);
          setState(STATE_CONNECTING);
          // will reconnect automatically
        });

        dropper.addEventListener('done', async () => {
          clearInterval(checkDropperInterval);
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
  }, []);

  switch (state) {
    case STATE_WAITING:
      return <DropperWaiting code={code} fileName={file.name} totalSize={file.size} />;

    case STATE_TRANSFER:
      return <DropperTransfer bytesSent={bytesSent} fileName={file.name} remainingSeconds={remainingSeconds} totalSize={file.size} />;
  
    default: // STATE_CONNECTING
      return <SpinningWheel />;
  }
}
