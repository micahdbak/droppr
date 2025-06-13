// ShowError.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFaceDizzy } from '@fortawesome/free-solid-svg-icons';

import { AppWindow } from './components';

export function ShowError() {
  const [error, setError] = useState("");

  useEffect(() => {
    const errStr = sessionStorage.getItem('error');
    console.log(errStr); // longer stack trace
    setError(errStr.split('\n')[0]); // just the first line (error message)
  }, []);

  return (
    <AppWindow>
      <div className="flex flex-col justify-center items-center">
        <img className="mb-2" src="error.png" />
        <p className="text-2xl font-semibold">Error.</p>
        <p className="text-sm mb-4">{error}</p>
        <a className="text-lg bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-xl mb-1" href="/#">
          Go Back
        </a>
      </div>
    </AppWindow>
  );
}
