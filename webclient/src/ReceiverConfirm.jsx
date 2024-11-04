// ReceiverConfirm.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow, Page, Header } from './components';
import { bytesToHRString } from './core';

export function ReceiverConfirm(props) {
  const [file, setFile] = useState({
    name: 'tmp.bin',
    size: 0,
    type: 'application/octet-stream'
  });
  const { code, onConfirm } = props;

  const onGoBack = () => {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
  };

  useEffect(() => {
    const peekFile = async () => {
      try {
        const res = await axios.get("/api/peek/" + code.toUpperCase());
        setFile(res.data.file);
      } catch (err) {
        console.log(err.toString());
        
        //sessionStorage.setItem('error', err.toString());
        //window.location.href = window.location.origin + "/#error";
        //window.location.reload();
      }
    };

    peekFile();
  }, []);
  
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText="Does this look right?" imgSrc="confirm.png">
          <div className="flex flex-col items-start">
            <p className="text-lg">The drop code is:</p>
            <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">{code.toUpperCase()}</p>
            <p className="text-xs text-gray-500">{file.name}, {bytesToHRString(file.size)}.</p>
            <div className="flex flex-row gap-1 mt-4">
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
          </div>
        </AppWindow>
        <p className="text-center text-sm text-red-400">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          &emsp;Don't receive drops from someone you don't trust.
        </p>
      </div>
    </Page>
  );
}