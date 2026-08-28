import { useState, useEffect } from "react";
import axios from "axios";

import { getFileStore, errorToString } from "@/lib";
import {
  Dropper,
  ShowError,
  UnsafeState,
  Success,
  About,
  Receiver,
  NotFound,
  Loading,
} from "@/routes";

const routes = {
  dropper: Dropper,
  error: ShowError,
  unsafe: UnsafeState,
  success: Success,
  about: About,
  receiver: Receiver,
  notfound: NotFound,
};

function getRouteFromHash() {
  const hash = window.location.hash.slice(1) || "dropper";

  if (Object.keys(routes).includes(hash)) {
    return hash;
  } else if (/^([a-zA-Z0-9]{6,6})$/.test(hash)) {
    return "receiver";
  }

  return "notfound";
}

export function Router() {
  const [ready, setReady] = useState(false);
  const [readyPercentage, setReadyPercentage] = useState(0);
  const [route, setRoute] = useState(getRouteFromHash());
  const [code, setCode] = useState(
    route === "receiver" ? window.location.hash.slice(1) : "",
  );

  // run API health check and file store clean up on mount
  useEffect(() => {
    const prepare = async () => {
      try {
        await axios.get("/api/check");
      } catch (err) {
        if (err.response && err.response.status === 409) {
          window.location.hash = "unsafe";
        } else {
          sessionStorage.setItem("error", errorToString(err));
          window.location.hash = "error";
        }

        // don't clear the file store
        setReady(true);
        return;
      }

      // if on FireFox, this will clear and prepare the file store
      // (this could take a while if the user cancelled a receive, or didn't
      // wait for clean-up to complete after receiving a drop.)
      await getFileStore((percentage) => setReadyPercentage(percentage));

      setReady(true);
    };

    prepare();
  }, []);

  // on hashchange event, check value and update route
  useEffect(() => {
    const handleHashChange = () => {
      const route = getRouteFromHash();
      setRoute(route);

      if (route === "receiver") {
        setCode(window.location.hash.slice(1));
      }
    };

    window.addEventListener("hashchange", handleHashChange);

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
    };
  }, []);

  if (!ready) {
    return <Loading percentage={readyPercentage} />;
  }

  const Route = routes[route];

  if (route === "receiver") {
    return <Route code={code} />;
  }

  return <Route />;
}
