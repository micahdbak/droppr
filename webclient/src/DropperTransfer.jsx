// DropperTransfer.jsx

import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import { Header, ProgressBar, AppWindow, Page } from './components';
import { bytesToString, secondsToString } from './core';

/**
 * @param {object} props
 * @param {number} props.bytesSent
 * @param {string} props.fileName
 * @param {number} props.remainingSeconds
 * @param {number} props.totalSize
 */
export function DropperTransfer(props) {
  const { bytesSent, fileName, remainingSeconds, totalSize } = props;
  
  const titleText = `Dropping ${fileName}...`;
  const percentTransferred = (100 * bytesSent / totalSize).toFixed(1);

  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText={titleText} imgSrc="drop.gif">
          <div className="flex flex-col items-start">
            <p className="text-base">{percentTransferred}% done</p>
            <ProgressBar bytes={bytesSent} total={totalSize} />
            <p className="text-sm text-gray-500 mb-3">{bytesToString(bytesSent)} of {bytesToString(totalSize)}</p>
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
