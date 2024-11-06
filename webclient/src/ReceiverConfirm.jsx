// ReceiverConfirm.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { bytesToString, errorToString } from './core';
import { AppWindow, Page, Header } from './components';

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

        // go to ShowError.jsx
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
            <p className="text-xs text-gray-500">{file.name}, {bytesToString(file.size)}.</p>
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
