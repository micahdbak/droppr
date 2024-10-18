// ReceiverConfirmation.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';

export function ReceiverConfirmation(props) {
  const { code, onConfirm } = props;
  
  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-start p-8">
        <p className="text-2xl mb-2">
          Are you sure you want<br />to receive&nbsp;
          <span className="font-mono bg-gray-200 px-2 rounded-lg">{code}</span>
          &nbsp;?
        </p>
        <p className="text-xs text-red-400 mb-4">
          <FontAwesomeIcon icon={faTriangleExclamation} /> Don't
          receive drops from someone you don't trust.
        </p>
        <button
          className="bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-lg mb-6"
          onClick={onConfirm}
        >
          Receive
        </button>
        <p className="text-sm text-gray-500">
          Changed your mind? <a className="text-blue-400 hover:underline" href="/#">Go back</a>.
        </p>
      </div>
    </Page>
  );
}