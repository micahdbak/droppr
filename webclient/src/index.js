// index.js (entry-point for webclient)

import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";
import axios from 'axios';

import { About } from './About.jsx';
import { ExistingCookies } from './ExistingCookies.jsx';
import { FileStore } from './core/index.js';
import { Main } from './Main.jsx';
import { ReceiverContainer } from './ReceiverContainer.jsx';
import { ShowError } from './ShowError.jsx';
import { Success } from './Success.jsx';
import { errorToString } from './core/index.js';

import { AppWindow, ProgressBar } from './components/index.js';

function ProgressThingy() {
  const [progress, setProgress] = useState(0);
  const [startTime] = useState(Date.now());

  const msElapsed = Date.now() - startTime;

  useEffect(() => {
    const _int = setInterval(() => {
      setProgress((_p) => {
        if (_p >= 10000) {
          return 0;
        }

        return _p + (Math.random() * 10);
      });
    }, 10);

    return () => {
      clearInterval(_int);
    };
  }, []);

  return (
    <AppWindow>
      <ProgressBar bytes={progress} total={10000} msElapsed={msElapsed} />
    </AppWindow>
  );
}

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
    path: "/progress",
    element: <ProgressThingy />
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

root.render(<p>Just a moment...</p>);

const start = async () => {
  if (window.location.hash !== "#error") {
    try {
      await axios.get("/api/check");
    } catch (err) {
      if (err.response && err.response.status === 409) {
        // shouldn't run dropper; there are existing cookies
        root.render(<ExistingCookies />);
        return;
      } else {
        sessionStorage.setItem('error', errorToString(err));

        // go to ShowError.jsx
        window.location.href = window.location.origin + "/#error";
        window.location.reload();
        return;
      }
    }
  }

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
        window.___DROPPR___.fileStore = null; // can't receive files, but can *try* to drop
        root.render(<RouterProvider router={router} />); // start droppr
      });
    } catch (err) {
      console.log('Error in index.js: ' + err.toString());
      // reset window.___DROPPR___ incase error thrown from that
      window.___DROPPR___ = {
        dropper: null,
        receiver: null,
        fileStore: null // probably can't receive files, but can *try* to drop
      };
      root.render(<RouterProvider router={router} />); // start droppr
    }
  }
};

start();
