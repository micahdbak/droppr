// ReceiverConfirm.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

import { bytesToString, errorToString } from './core';
import { AppWindow } from './components';

/**
 * @param {object} props
 * @param {string} props.code
 * @param {function} props.onConfirm
 */
export function ReceiverConfirm(props) {
  const { code, onConfirm } = props;

  const [file, setFile] = useState({
    name: 'tmp.bin',
    size: 0,
    type: 'application/octet-stream'
  });

  const onGoBack = () => {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
  };

  useEffect(() => {
    console.log('1');
    
    const peekFile = async () => {
      try {
        const res = await axios.get("/api/peek/" + code.toUpperCase());
        setFile(res.data.file);
      } catch (err) {
        sessionStorage.setItem('error', errorToString(err));
        console.log(err);
      }
    };

    peekFile();
  }, []);
  
  return (
    <AppWindow>
      <img src="/confirm.png" className="w-full h-20 mb-4 object-contain" />
      
      <p className="text-xl mb-2">Does this look right?</p>
      <p
        className="text-2xl bg-gray-200 px-2 rounded-lg whitespace-nowrap text-ellipsis mb-1"
        style={{ maxWidth: '18rem', overflow: 'hidden', textOverflow: 'text-ellipsis' }}
      >
        {file.name}
      </p>
      <p className="text-xs mb-4 text-gray-500"><b>{bytesToString(file.size)}</b>, drop code is <b>{code}</b></p>
      
      <div className="flex flex-row gap-1">
        <button
          type="button"
          className="bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
          onClick={onConfirm}
        >
          Receive
        </button>
        <button
          className="bg-gray-100 ring-1 ring-inset hover:ring-2 ring-gray-400 text-gray-700 px-4 py-2 rounded-lg"
          onClick={onGoBack}
        >
          Go back
        </button>
      </div>
    </AppWindow>
  );
}
