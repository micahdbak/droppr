import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

<<<<<<< Updated upstream
import { App } from './App.jsx';
=======
import { Main } from './main.jsx'
import * as droppr from './droppr/index.js';
>>>>>>> Stashed changes

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
<<<<<<< Updated upstream
    <App />
=======
    <BrowserRouter>
      <Main />
    </BrowserRouter>
>>>>>>> Stashed changes
  </React.StrictMode>,
);
