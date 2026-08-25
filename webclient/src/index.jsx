import "../tailwind.css";

import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider } from "react-router";
import axios from "axios";

import { About } from "./About.jsx";
import { ExistingCookies } from "./ExistingCookies.jsx";
import { Main } from "./Main.jsx";
import { ReceiverContainer } from "./ReceiverContainer.jsx";
import { ShowError } from "./ShowError.jsx";
import { Success } from "./Success.jsx";
import { errorToString } from "./lib";

const router = createHashRouter([
  {
    path: "/",
    element: <Main />,
  },
  {
    path: "/error",
    element: <ShowError />,
  },
  {
    path: "/success",
    element: <Success />,
  },
  {
    path: "/about",
    element: <About />,
  },
  {
    path: "/:code",
    element: <ReceiverContainer />,
  },
]);

const root = ReactDOM.createRoot(document.getElementById("root"));

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
        sessionStorage.setItem("error", errorToString(err));

        // go to ShowError.jsx
        window.location.href = window.location.origin + "/#error";
        window.location.reload();
        return;
      }
    }
  }

  root.render(<RouterProvider router={router} />); // start droppr
};

start();
