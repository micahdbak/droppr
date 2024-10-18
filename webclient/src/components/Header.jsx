// Header.jsx

import React from 'react';

const version = process.env.REACT_APP_VERSION;

export function Header(props) {
  return (
    <div className="flex flex-col justify-center items-center gap-1">
      <p className="text-xl font-semibold">droppr</p>
    </div>
  );
}