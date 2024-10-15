// Waiting.jsx

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHourglassHalf } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';

export function Waiting() {
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center items-center">
        <FontAwesomeIcon className="text-2xl mb-2" icon={faHourglassHalf} />
        <p className="text-lg">Just a moment...</p>
      </div>
    </Page>
  );
}