// AppWindow.jsx

import React from 'react';

export function AppWindow(props) {
  const { children, justWindow, imgSrc, titleText } = props;

  if (justWindow) {
    return (
      <div className="w-96 h-96 p-6 border-2 border-gray-200 rounded-xl">
        {children}
      </div>
    )
  }

  return (
    <div
      className="relative w-96 h-96 p-6 pt-4 pb-8 border-2 border-gray-200 rounded-xl"
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr',
        gridTemplateRows: '2fr 3fr 5fr',
        justifyItems: 'center',
        alignItems: 'center'
      }}
    >
      <p className="text-2xl text-center">{titleText}</p>
      <img src={imgSrc} className="w-full h-full object-fill" />
      <div className="w-full h-full flex flex-col justify-center items-center">
        {children}
      </div>
    </div>
  );
}
