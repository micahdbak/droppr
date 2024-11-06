// index.js (entry-point for webclient)

import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";

import { FileStore } from './core/index.js';
import { About } from './About.jsx';
import { Main } from './Main.jsx';
import { Success } from './Success.jsx';
import { ReceiverContainer } from './ReceiverContainer.jsx';
import { ShowError } from './ShowError.jsx';

const router = createHashRouter([
  {
    path: "/",
    element: <Main /> // Main will provide DropperContainer when ready
  },
  {
    path: "/error",
    element: <ShowError />
  },
  {
    path: "/success",
    element: <Success />
  },
  {
    path: "/about",
    element: <About />
  },
  {
    path: "/:code",
    element: <ReceiverContainer />
  }
]);

const root = ReactDOM.createRoot(document.getElementById('root'));

// check if File System Access API is available (Chromium browsers)
if (window.showSaveFilePicker) {
  window.___DROPPR___ = {
    dropper: null,
    receiver: null,
    fileStore: null // don't use IndexedDB
  };
  root.render(<RouterProvider router={router} />); // start droppr
} else {
  // non-Chromium browsers, e.g., FireFox, Safari, etc.
  try {
    window.___DROPPR___ = {
      dropper: null,
      receiver: null,
      fileStore: new FileStore()
    };
    root.render(<p>Just a moment...</p>);

    // connection to IndexedDB successful
    window.___DROPPR___.fileStore.addEventListener('open', async () => {
      await window.___DROPPR___.fileStore.clear((progress) => {
        console.log("Cleaning up... " + `${progress}%`);
      });
      root.render(<RouterProvider router={router} />); // start droppr
    });

    // connection to IndexedDB not successful
    window.___DROPPR___.fileStore.addEventListener('openerror', (event) => {
      console.log('Error in index.js: ' + event.target.error.toString());
      window.___DROPPR___.fileStore = null; // can't receive files, but can *try* drop
      root.render(<RouterProvider router={router} />); // start droppr
    });
  } catch (err) {
    console.log('Error in index.js: ' + err.toString());
    // reset window.___DROPPR___ incase error thrown from that
    window.___DROPPR___ = {
      dropper: null,
      receiver: null,
      fileStore: null // can't receive files, but can *try* to drop
    };
    root.render(<RouterProvider router={router} />); // start droppr
  }
}
