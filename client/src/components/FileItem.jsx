// Copyright (C) 2024 droppr. All Rights Reserved.
//

import React, { useState } from 'react';

export function FileItem(props) {
  const { name, size, href, disabled } = props;

  // display in kilobytes (for now)
  const sizeText = `${+(size / 1024).toFixed(1)} kB`;

  return href ? (
    <a
      className={
        'flex-none flex flex-col items-center justify-start ' +
        'w-32 h-32 p-2 text-center rounded-lg hover:bg-blue-200'
      }
      href={href}
      download={name}
    >
      <img className='mb-1' src='/file.png' width='48' height='48' />
      <p className='text-xs break-all text-slate-800 mb-1'>{name}</p>
      <p className='text-xs text-slate-500 mb-1'>{sizeText}</p>
    </a>
  ) : (
    <div
      className={
        'flex-none flex flex-col items-center justify-start ' +
        'w-32 h-32 p-2 text-center rounded-lg ' +
        (disabled ? 'opacity-50' : '')
      }
    >
      <img className='mb-1' src='/file.png' width='48' height='48' />
      <p className='text-xs break-all text-slate-800 mb-1'>{name}</p>
      <p className='text-xs text-slate-500 mb-1'>{sizeText}</p>
    </div>
  );
}
