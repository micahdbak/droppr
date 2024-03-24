import { Dropper, Receiver, Landing } from './pages';
import React, { useState, useEffect } from 'react';

export function Main() {
  const [view, setView] = useState('landing');
  const [dropId, setDropId] = useState(null);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);

    if (searchParams.has('id')) {
      setDropId(searchParams.get('id'));
      setView('receiver');
    }
  }, []);

  if (view === 'dropper') {
    return <Dropper />;
  } else if (view === 'receiver') {
    return <Receiver id={dropId} />;
  } else if (view === 'landing') {
    return <Landing />;
  } else {
    return <p>404</p>;
  }
}
