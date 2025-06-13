// ReceiverProcessing.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow } from './components';
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
    <AppWindow>
      <img src="/hourglass.gif" className="w-full h-20 mb-4 object-contain" />
      <p className="text-xl">{(isCleanUp ? 'Cleaning up...' : 'Processing...')}</p>
      <p className="text-lg mb-2">Received {fileName} {bytesToString(totalSize)} in {secondsToString(elapsedSeconds)}.</p>
      <p className="text-sm">{fileName} will be ready in just a moment.</p>
    </AppWindow>
  );
}
