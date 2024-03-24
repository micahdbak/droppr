import React, { useState, useEffect } from 'react';

// see files in ./interface for exports; e.g., 'drop', 'receive'
import * as droppr from './interface';

export function App() {
  const [status, setStatus] = useState('');

  function onDrop() {
    console.log('Drop clicked');
    droppr.drop('this is a file :wink:', (update) => {
      console.log(update);
    });
  }

  function onReceive() {
    console.log('Receive clicked');
    droppr.receive('drop identifier', (update) => {
      console.log(update);
    });
  }

  return (
    <>
      <button onClick={onDrop}>Drop</button>
      <button onClick={onReceive}>Receive</button>
    </>
  );
}
