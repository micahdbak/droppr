// Copyright (C) 2024 droppr. All rights reserved.
//

import React from 'react';

import { Recipient } from '../components/index.js';

export function Receive(props) {
  const { id } = props;

  return (
    <>
      <div className="fixed flex flex-row items-center justify-between top-5 right-8 left-8 h-6 gap-2">
        <p className="text-lg text-slate-600">receivr.</p>
        <p className="text-xs font-mono text-slate-800 rounded px-2 py-1 bg-blue-100">v0.2.0</p>
      </div>
      <div className="fixed top-16 right-8 bottom-16 left-8">
        <Recipient id={id} />
      </div>
      <div className="fixed flex flex-row items-center justify-center right-8 bottom-5 left-8 h-6 gap-4">
        <a className="text-xs text-blue-500" href="/">Drop</a>
        <a className="text-xs text-blue-500" href="/?view=about">About</a>
        <p className="text-xs text-slate-600">Copyright (C) 2024 droppr.</p>
      </div>
    </>
  );
}
