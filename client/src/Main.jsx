// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useState, useEffect } from 'react';

import { About } from './pages/index.js';
import { Dropper, Footer, Recipient } from './components/index.js';

const _version = process.env.REACT_APP_VERSION;

export function Main() {
  const [view, setView] = useState('drop');
  const [id, setId] = useState('');

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('id')) {
      setId(searchParams.get('id'));
      setView('receive');
    } else if (searchParams.has('view')) {
      // e.g., params '?view=about' gives about page
      setView(searchParams.get('view'));
    }
  }, []);

  if (view === 'receive') {
    return (
      <>
        <div className="fixed flex flex-row items-center justify-between top-5 right-8 left-8 h-6 gap-2">
          <p className="text-lg text-slate-600">receivr.</p>
          <p className="text-xs font-mono text-slate-800 rounded px-2 py-1 bg-blue-100">
            {_version}
          </p>
        </div>
        <Recipient className="fixed top-16 right-8 bottom-16 left-8" id={id} />
        <Footer className="fixed right-8 bottom-5 left-8" />
      </>
    );
  } else if (view === 'about') {
    return <About />;
  }

  return (
    <>
      <div className="fixed flex flex-row items-center justify-between top-5 right-8 left-8 h-6 gap-2">
        <p className="text-lg text-slate-600">droppr.</p>
        <p className="text-xs font-mono text-slate-800 rounded px-2 py-1 bg-blue-100">
          {_version}
        </p>
      </div>
      <Dropper className="fixed top-16 right-8 bottom-16 left-8" />
      <Footer className="fixed right-8 bottom-5 left-8" />
    </>
  );
}
