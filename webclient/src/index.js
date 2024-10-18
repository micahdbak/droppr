import React from 'react';
import ReactDOM from 'react-dom/client';
import {
  createHashRouter,
  RouterProvider,
} from "react-router-dom";

import { About } from './About.jsx';
import { Download } from './Download.jsx';
import { ErrorContainer } from './ErrorContainer.jsx';
import { Main } from './Main.jsx';
import { ReceiverContainer } from './ReceiverContainer.jsx';
import { Success } from './Success.jsx';

const router = createHashRouter([
  {
    path: "/",
    element: <Main /> // Main will provide DropperContainer when ready
  },
  {
    path: "/error",
    element: <ErrorContainer />
  },
  {
    path: "/success",
    element: <Success />
  },
  {
    path: "/download",
    element: <Download />
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
root.render(
  <RouterProvider router={router} />
);