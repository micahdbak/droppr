import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

import { Main } from './main.jsx'

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <Main />
  </React.StrictMode>,
);
