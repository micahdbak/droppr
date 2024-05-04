// Copyright (C) 2024 droppr. All Rights Reserved.
//

import React from 'react';

export function Footer(props) {
  const { className } = props;

  return (
    <div
      className={
        'flex flex-row items-center justify-center h-6 gap-4 ' + className
      }
    >
      <a className="text-xs text-blue-500 hover:underline" href="/">
        Drop
      </a>
      <a className="text-xs text-blue-500 hover:underline" href="/?view=about">
        About
      </a>
      <p className="text-xs text-slate-600">Copyright (C) 2024 droppr.</p>
    </div>
  );
}
