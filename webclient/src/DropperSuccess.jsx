// DropperSuccess.jsx

import React from 'react';

import { Page, Header, AppWindow } from './components';
import { bytesToHRString } from './core';

export function DropperSuccess() {
  let elapsedSeconds = sessionStorage.getItem('elapsedSeconds');
  let totalSize = sessionStorage.getItem('totalSize');
  let numFiles = sessionStorage.getItem('numFiles');

  if (elapsedSeconds === null || totalSize === null || numFiles === null) {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
    return <></>; // blank screen
  }

  elapsedSeconds = JSON.parse(elapsedSeconds);
  totalSize = JSON.parse(totalSize);
  numFiles = JSON.parse(numFiles);

  const dropSummary =
    `Sent ${numFiles} ${numFiles === 1 ? " file" : " files"} ` +
    `(${bytesToHRString(totalSize)}) in ${Math.round(elapsedSeconds)} seconds.`;

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
            <p className="text-lg mb-2">{dropSummary}</p>
            <p className="text-sm">
              That's an average speed of {bytesToHRString(avgBytesPerSecond)} per second.
            </p>
          </div>
        </AppWindow>
        <div className="flex flex-row justify-center items-center gap-1">
          <p className="text-sm mr-2">Send again, or receive?</p>
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