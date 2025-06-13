// Success.jsx

import React from 'react';

import { AppWindow } from './components';
import { bytesToString, secondsToString } from './core';

export function Success() {
  let isDropper = sessionStorage.getItem('isDropper');
  let elapsedSeconds = sessionStorage.getItem('elapsedSeconds');
  let totalSize = sessionStorage.getItem('totalSize');
  let fileName = sessionStorage.getItem('fileName');

  if (!isDropper || !elapsedSeconds || !totalSize || !fileName) {
    // go to Main.jsx
    window.location.href = window.location.origin + "/#";
    window.location.reload();
    return <></>; // blank screen
  }

  // isDropper is already a string
  elapsedSeconds = JSON.parse(elapsedSeconds);
  totalSize = JSON.parse(totalSize);
  // fileName is already a string

  const summary = (isDropper === 'true' ? 'Sent ' : 'Received ') + fileName
    + ` (${bytesToString(totalSize)}) in ${secondsToString(elapsedSeconds)}.`;
  const avgBytesPerSecond = Math.ceil(totalSize / elapsedSeconds);

  const onGoBack = () => {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
  };

  return (
    <AppWindow>
      <div className="flex flex-col items-center">
        <img className="mb-2" src="success.png" />
        <p className="text-2xl font-semibold">Done!</p>
        <p className="text-sm mb-4">{summary}</p>
        <a className="text-lg bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-xl mb-1" href="/#">
          End Session
        </a>
      </div>
    </AppWindow>
  );
}
