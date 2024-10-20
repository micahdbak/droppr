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
import { DropperSuccess } from './DropperSuccess.jsx';
import { ReceiverContainer } from './ReceiverContainer.jsx';
import { ReceiverDownload } from './ReceiverDownload.jsx';
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
    element: <DropperSuccess />
  },
  {
    path: "/download",
    element: <ReceiverDownload />
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

const fileStore = new FileStore();
window.___DROPPR___ = {
  fileStore: fileStore,
  dropper: null,
  receiver: null
};

const root = ReactDOM.createRoot(document.getElementById('root'));

fileStore.addEventListener('open', () => {
  root.render(<RouterProvider router={router} />);
});

fileStore.addEventListener('openerror', (event) => {
  root.render(<p>An error occurred: {event.target.error.toString()}</p>)
})