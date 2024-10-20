// ReceiverTransfer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { Page, Header, AppWindow, ProgressBar } from './components';
import { bytesToHRString } from './core';

export function ReceiverTransfer(props) {
  const { bytesReceived, totalSize, numFiles, remainingSeconds } = props;
  
  const percentTransferred = (100 * bytesReceived / totalSize).toFixed(1);
  const titleText = `Receiving ${numFiles} ${numFiles > 1 ? "files" : "file"}...`;

  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText={titleText} imgSrc="drop.gif">
          <div className="flex flex-col items-start">
            <p className="text-base">{percentTransferred}% done</p>
            <ProgressBar bytes={bytesReceived} total={totalSize} />
            <p className="text-sm text-gray-500 mb-3">{bytesToHRString(bytesReceived)} of {bytesToHRString(totalSize)}</p>
            <p className="text-base">{remainingSeconds} {remainingSeconds === 1 ? "second" : "seconds"} remaining</p>
          </div>
        </AppWindow>
        <p className="text-center text-sm text-red-400">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          &emsp;Don't close this page.
        </p>
      </div>
    </Page>
  );
}