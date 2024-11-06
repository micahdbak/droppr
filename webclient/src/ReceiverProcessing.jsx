// ReceiverProcessing.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow, Page, Header } from './components';
import { bytesToString, secondsToString } from './core';

/**
 * @param {object} props
 * @param {number} elapsedSeconds
 * @param {string} fileName
 * @param {boolean} isCleanUp
 * @param {number} progress
 * @param {number} totalSize
 */
export function ReceiverProcessing(props) {
  const { elapsedSeconds, fileName, isCleanUp, progress, totalSize } = props;
  
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText={(isCleanUp ? 'Cleaning up' : 'Processing') + `... ${progress}%`} imgSrc="processing.gif">
          <div className="flex flex-col items-start">
            <p className="text-lg mb-2">Received {fileName} {bytesToString(totalSize)} in {secondsToString(elapsedSeconds)}.</p>
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
