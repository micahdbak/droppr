// Waiting.jsx

import React from 'react';

import { Page, Header } from './components';

export function Waiting() {
  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center items-center">
        <img src="hourglass.gif" style={{ width: '64px' }} />
        <p className="text-lg">Just a moment...</p>
      </div>
    </Page>
  );
}