// ErrorContainer.jsx

import React, { useState, useEffect } from 'react';

export function ErrorContainer() {
  const [error, setError] = useState(null);

  useEffect(() => {
    setError(sessionStorage.getItem('error'));
  }, [])

  return (
    <>
      <p className="text-red-400">Error: {error}</p>
      <a className="text-blue-400" href="/#">Go back</a>
    </>
  );
}