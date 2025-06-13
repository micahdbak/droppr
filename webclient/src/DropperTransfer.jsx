// DropperTransfer.jsx

import React from 'react';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";

import { ProgressBar, AppWindow } from './components';
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

  const percentTransferred = Math.round(100 * bytesSent / totalSize);

  return (
    <AppWindow>
      <img src="/drop.gif" className="w-full" />
      <p className="text-lg">{`Dropping ${fileName}...`}</p>
      <p className="text-base">{percentTransferred}% done</p>
      <ProgressBar percentage={percentTransferred} />
      <p className="text-sm text-gray-500 mb-3">{bytesToString(bytesSent)} of {bytesToString(totalSize)}</p>
      <p className="text-base">{secondsToString(remainingSeconds)} remaining</p>
    </AppWindow>
  );
}
