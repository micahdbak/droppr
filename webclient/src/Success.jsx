// Success.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';

export function Success() {
  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center">
        <FontAwesomeIcon className="text-4xl text-green-500 mb-2" icon={faCheck} />
        <p className="text-xl mb-4">Dropped!</p>
        <a className="text-sm text-blue-400 hover:underline" href="/#">Go back.</a>
      </div>
    </Page>
  );
}