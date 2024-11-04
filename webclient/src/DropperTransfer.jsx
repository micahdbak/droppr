// DropperTransfer.jsx

import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import { Header, ProgressBar, AppWindow, Page } from './components';
import { bytesToHRString } from './core';

export function DropperTransfer(props) {
  const { fileName, bytesSent, totalSize, remainingSeconds } = props;
  
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
            <p className="text-sm text-gray-500 mb-3">{bytesToHRString(bytesSent)} of {bytesToHRString(totalSize)}</p>
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