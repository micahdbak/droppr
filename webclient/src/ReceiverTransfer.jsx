// ReceiverTransfer.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { Page, Header, AppWindow, ProgressBar } from './components';
import { bytesToString, secondsToString } from './core';

/**
 * @param {object} props
 * @param {number} bytesReceived
 * @param {string} fileName
 * @param {number} remainingSeconds
 * @param {number} totalSize
 */
export function ReceiverTransfer(props) {
  const { bytesReceived, fileName, remainingSeconds, totalSize } = props;
  
  const percentTransferred = (100 * bytesReceived / totalSize).toFixed(1);

  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText={`Receiving ${fileName}...`} imgSrc="drop.gif">
          <div className="flex flex-col items-start">
            <p className="text-base">{percentTransferred}% done</p>
            <ProgressBar bytes={bytesReceived} total={totalSize} />
            <p className="text-sm text-gray-500 mb-3">{bytesToString(bytesReceived)} of {bytesToString(totalSize)}</p>
            <p className="text-base">{secondsToString(remainingSeconds)} remaining</p>
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
