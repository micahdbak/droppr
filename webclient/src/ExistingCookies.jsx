import React, { useState } from 'react';
import axios from 'axios';

import { errorToString } from './core';

const STATE_START   = 0;
const STATE_WAITING = 1;

export function ExistingCookies() {
  const [state, setState] = useState(STATE_START);
  
  const onContinue = async () => {
    setState(STATE_WAITING);
    try {
      await axios.post("/api/cleanup");
      window.location.reload();
    } catch (err) {
      sessionStorage.setItem('error', errorToString(err));

      // go to ShowError.jsx
      window.location.href = window.location.origin + "/#error";
      window.location.reload();
    }
  };

  return (
    <>
      <p>Your browser suggests a drop is already in progress.</p>
      <p>Continuing WILL BREAK an in progress drop in another tab.</p>
      <p>(Close this tab if you changed your mind.)</p>
      <button onClick={onContinue}>Continue</button>
    </>
  );
}
