// DropperContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Dropper } from './core';
import { DropperWaiting } from './DropperWaiting.jsx';
import { DropperTransfer } from './DropperTransfer.jsx';

const STATE_WAITING = 'waiting';
const STATE_CONNECTING = 'connecting';
const STATE_SENDING = 'sending';

export function DropperContainer(props) {
  const { files, labels, code } = props;

  const [state, setState] = useState(STATE_WAITING);
  const [totalSize, setTotalSize] = useState(1);
  const [bytesSent, setBytesSent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    // run exactly once on execution of JS within this component
    if (window.___DROPPR___.dropper === null) {
      // calculate total size
      let _totalSize = 0;
      files.forEach(file => {
        _totalSize += file.size;
      });
      setTotalSize(_totalSize);

      // will be used by DropperSuccess.jsx
      sessionStorage.setItem('totalSize', JSON.stringify(_totalSize));
      sessionStorage.setItem('numFiles', files.length);

      // create a new dropper object
      const dropper = new Dropper(files, labels);
      window.___DROPPR___.dropper = dropper;
      let checkDropperInterval = null;

      // on connected to peer
      dropper.addEventListener('connected', () => {
        setState(STATE_SENDING);
        const startTime = Date.now(); // for checkDropperInterval
  
        // do this until done
        checkDropperInterval = setInterval(() => {
          const _bytesSent = dropper.bytesSent;
  
          // calculate remaining seconds
          const elapsedSeconds = (Date.now() - startTime) / 1000;
          const averageSPB = elapsedSeconds / _bytesSent; // SPB = seconds per byte
          const _remainingSeconds = (_totalSize - _bytesSent) * averageSPB;
  
          setBytesSent(_bytesSent);
          setRemainingSeconds(Math.round(_remainingSeconds));

          // for DropperSuccess.jsx
          sessionStorage.setItem('elapsedSeconds', JSON.stringify(elapsedSeconds));
        }, 250); // 250ms
      });

      // a network issue has temporarily disconnected the dropper
      dropper.addEventListener('disconnected', () => {
        setState(STATE_CONNECTING);
      });

      // the connection has failed and cannot be recovered
      dropper.addEventListener('failed', () => {
        // go to ShowError.jsx
        sessionStorage.setItem('error', 'Something broke.');
        window.location.href = window.location.origin + "/#error";
        window.location.reload();
      });

      // the drop has completed
      dropper.addEventListener('done', async () => {
        // dropper runs dropper.close() internally
        clearInterval(checkDropperInterval); // abundance of whatnot
        await axios.post('/api/cleanup'); // deletes cookies

        // go to DropperSuccess.jsx
        window.location.href = window.location.origin + "/#success";
        window.location.reload();
      });
    }
  }, []);

  if (state === STATE_WAITING) {
    return <DropperWaiting code={code} totalSize={totalSize} numFiles={files.length} />;
  }

  if (state === STATE_CONNECTING) {
    return <></>; // blank screen
  }

  // assume state === STATE_SENDING

  return (
    <DropperTransfer
      numFiles={files.length}
      bytesSent={bytesSent}
      totalSize={totalSize}
      remainingSeconds={remainingSeconds}
    />
  );
}