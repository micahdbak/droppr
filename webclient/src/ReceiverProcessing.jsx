// ReceiverProcessing.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow, Page, Header } from './components';
import { bytesToHRString } from './core';

export function ReceiverProcessing(props) {
  const { isCleanUp, progress, elapsedSeconds, totalSize, fileName } = props;
  
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText={(isCleanUp ? 'Cleaning up' : 'Processing') + `... ${progress}%`} imgSrc="processing.gif">
          <div className="flex flex-col items-start">
            <p className="text-lg mb-2">Received {fileName} {bytesToHRString(totalSize)} in {Math.round(elapsedSeconds)} seconds.</p>
            <p className="text-sm">{fileName} will be ready in just a moment.</p>
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