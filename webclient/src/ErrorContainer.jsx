// ErrorContainer.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceDizzy } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';

export function ErrorContainer() {
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(sessionStorage.getItem('error'));
  }, []);

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center">
        <FontAwesomeIcon className="text-4xl text-red-400 mb-4" icon={faFaceDizzy} />
        <p className="text-xl font-bold">Error</p>
        <p className="text-lg mb-2">{error}</p>
        <a className="text-sm text-blue-400 hover:underline" href="/#">Go back.</a>
      </div>
    </Page>
  );
}