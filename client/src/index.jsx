import React from 'react';
import ReactDOM from 'react-dom/client';

// see exports from ./droppr/index.js; can be used as droppr.X
import * as droppr from './droppr/index.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <p>Droppr.</p>
  </React.StrictMode>,
);
