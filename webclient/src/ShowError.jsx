// ShowError.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceDizzy } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';

export function ShowError() {
  const [error, setError] = useState("");

  useEffect(() => {
    const errStr = sessionStorage.getItem('error');
    console.log(errStr); // longer stack trace
    setError(errStr.split('\n')[0]); // just the first line (error message)
  }, []);

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center">
        <FontAwesomeIcon className="text-4xl text-red-400 mb-4" icon={faFaceDizzy} />
        <p className="text-xl mb-1">An unexpected error occurred.</p>
        <p className="text-sm mb-2">{error}</p>
        <a className="text-sm text-blue-400 hover:underline" href="/#">Go back.</a>
      </div>
    </Page>
  );
}
