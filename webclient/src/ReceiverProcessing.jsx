// ReceiverProcessing.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow, Page, Header } from './components';
import { bytesToHRString } from './core';

export function ReceiverProcessing(props) {
  const { elapsedSeconds, totalSize } = props;
  
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText="Processing..." imgSrc="processing.gif">
          <div className="flex flex-col items-start">
            <p className="text-lg mb-2">Sent {bytesToHRString(totalSize)} in {Math.round(elapsedSeconds)} seconds.</p>
            <p className="text-sm">Your files will be ready to download in just a moment.</p>
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