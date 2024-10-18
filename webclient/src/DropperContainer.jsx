// DropperContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Dropper } from './core';
import { Header, LoadingBar, Page } from './components';
import { bytesToHRString } from './utils.js';
import { DropperWaiting } from './DropperWaiting.jsx';

export function DropperContainer(props) {
  const { files, labels, code } = props;

  const [state, setState] = useState('waiting');
  const [totalSize, setTotalSize] = useState(1);
  const [bytesSent, setBytesSent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    // set total size
    let _totalSize = 0;
    files.forEach(file => {
      _totalSize += file.size;
    });
    setTotalSize(_totalSize);
    
    const _dropper = new Dropper(files, labels);

    _dropper.addEventListener('connected', () => {
      setState('connected');

      const startTime = Date.now();

      // do this until done
      setInterval(() => {
        const _bytesSent = _dropper.bytesSent;

        const secondsElapsed = (Date.now() - startTime) / 1000;
        const averageSPB = secondsElapsed / _bytesSent; // SPB = seconds per byte
        const _remainingSeconds = (_totalSize - _bytesSent) * averageSPB;

        setBytesSent(_bytesSent);
        setRemainingSeconds(Math.round(_remainingSeconds));
      }, 250); // 4 times per second
    });
    _dropper.addEventListener('disconnected', () => { setState('disconnected'); });
    _dropper.addEventListener('failed', () => {
      sessionStorage.setItem('error', 'Something broke.');
      window.location.replace(window.location.origin + "/#error"); // force refresh
    });
    _dropper.addEventListener('done', async () => {
      await axios.post('/api/cleanup');
      window.location.replace(window.location.origin + "/#success"); // force refresh
    });

    return () => {
      // it is in vain that we release the dropper
    }
  }, []);

  // show drop code and prompt user to copy
  if (state === "waiting") {
    return <DropperWaiting code={code} totalSize={totalSize} numFiles={files.length} />;
  }

  const percentTransferred = (100 * bytesSent / totalSize).toFixed(1);

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-start w-72">
        <img src="drop.gif" />
        <p className="text-2xl mb-2">Dropping {files.length} {files.length > 1 ? "files" : "file"}</p>
        <p className="text-base">{percentTransferred}% done</p>
        <LoadingBar bytes={bytesSent} total={totalSize} />
        <p className="text-sm text-gray-500 mb-3">{bytesToHRString(bytesSent)} of {bytesToHRString(totalSize)}</p>
        <p className="text-base">{remainingSeconds} {remainingSeconds === 1 ? "second" : "seconds"} remaining</p>
      </div>
    </Page>
  );
}