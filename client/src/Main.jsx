// Copyright (C) 2024 droppr. All rights reserved.
//

import React, { useState, useEffect } from 'react';

import { About, Drop, Receive } from './pages/index.js';

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

  switch (view) {
    case 'receive':
      return <Receive id={id} />;

      break;

    case 'about':
      return <About />;

      break;

    default:
      return <Drop />;

      break;
  };
}
