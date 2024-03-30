// Copyright (C) 2024 droppr. All rights reserved.
//

import { Dropper, Receiver, About } from './pages';
import React, { useState, useEffect } from 'react';

export function Main() {
  const [view, setView] = useState('drop');
  const [dropId, setDropId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('id')) {
      setDropId(searchParams.get('id'));
      setView('receiver');
    } else if (searchParams.has('view')) {
      setView(searchParams.get('view'));
    }
  }, []);

  if (view === 'drop') {
    return <Dropper />;
  } else if (view === 'receiver') {
    return <Receiver id={dropId} />;
  } else if (view === 'about') {
    return <About />;
  } else {
    return <p>404</p>;
  }
}
