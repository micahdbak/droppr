import React, { useState, useEffect } from 'react';

import { Dropper, Receiver } from './pages';

export function Main() {
  const [view, setView] = useState('dropper');
  const [dropId, setDropId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('id')) {
      setDropId(searchParams.get('id'));
      setView('receiver');
    }
  }, []);

  if (view === 'dropper') {
    return <Dropper />
  } else if (view === 'receiver') {
    return <Receiver id={dropId} />
  } else {
    return <p>404</p>;
  }
}
