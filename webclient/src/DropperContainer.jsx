// DropperContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { Dropper } from './core';

export function DropperContainer(props) {
  const { files, dropId } = props;
  
  const [state, setState] = useState('waiting');
  const [fileinfo, setFileinfo] = useState([]);
  const [totalSize, setTotalSize] = useState(0);
  const [bytesSent, setBytesSent] = useState(0);

  useEffect(() => {
    const _dropper = new Dropper(files);

    const checkInterval = setInterval(() => {
      setFileinfo(_dropper.fileinfo);
      setTotalSize(_dropper.totalSize);
      setBytesSent(_dropper.bytesSent);
    }, 1000);

    _dropper.addEventListener('connected', () => { setState('connected'); });
    _dropper.addEventListener('disconnected', () => { setState('disconnected'); });
    _dropper.addEventListener('failed', () => { setState('failed'); });
    _dropper.addEventListener('done', async () => {
      clearInterval(checkInterval);
      await axios.post('/api/cleanup');
      window.location.replace(window.location.origin + "/#success"); // force refresh
    });
  }, []);

  return (
    <>
      <p>Ready to drop {dropId}</p>
      <p>State: {state}</p>
      <p>{JSON.stringify(fileinfo)}</p>
      <p>{bytesSent} / {totalSize}</p>
    </>
  );
}