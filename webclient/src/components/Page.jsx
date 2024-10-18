// Page.jsx

import React from 'react';

export function Page(props) {
  const { children, title } = props;

  return (
    <div className="fixed top-0 left-0 w-screen h-screen p-6 flex flex-col justify-between items-center">
      {children}
      <p className="text-center text-base">
        <a className="text-blue-400 hover:underline" href="#about">About</a> &bull;
        Privacy Policy &bull;
        Terms of Use
      </p>
    </div>
  );
}