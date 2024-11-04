// Success.jsx

import React from 'react';

import { Page, Header, AppWindow } from './components';
import { bytesToHRString } from './core';

export function Success() {
  let isDropper = sessionStorage.getItem('isDropper');
  let elapsedSeconds = sessionStorage.getItem('elapsedSeconds');
  let totalSize = sessionStorage.getItem('totalSize');
  let fileName = sessionStorage.getItem('fileName');

  if (!isDropper || !elapsedSeconds || !totalSize || !fileName) {
    sessionStorage.setItem('error', `${isDropper} ${elapsedSeconds} ${totalSize} ${fileName}`);
    window.location.href = window.location.origin + "/#error";
    window.location.reload();
    return <></>; // blank screen
  }

  // isDropper is already a string
  elapsedSeconds = JSON.parse(elapsedSeconds);
  totalSize = JSON.parse(totalSize);
  // fileName is already a string

  const summary = (isDropper === 'true' ? 'Sent ' : 'Received ') + fileName
    + ` (${bytesToHRString(totalSize)}) in ${Math.round(elapsedSeconds)} seconds.`;
  const avgBytesPerSecond = (totalSize / elapsedSeconds).toFixed();

  const onGoBack = () => {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
  };

  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText="All done!" imgSrc="success.png">
          <div className="flex flex-col items-start">
            <p className="text-lg mb-2">{summary}</p>
            <p className="text-sm">
              That's an average speed of {bytesToHRString(avgBytesPerSecond)} per second.
            </p>
          </div>
        </AppWindow>
        <div className="flex flex-row justify-center items-center gap-1">
          <p className="text-sm mr-2">Looks good?</p>
          <button
            className="bg-gray-700 hover:bg-gray-500 text-white text-sm px-2 py-1 rounded-lg"
            onClick={onGoBack}
          >
            Go back
          </button>
        </div>
      </div>
    </Page>
  );
}