import { useEffect } from "react";

import { bytesToString, secondsToString } from "@/lib";
import { AppWindow } from "@/layouts";
import { Button } from "@/components";

export function Success() {
  const isDropper = sessionStorage.getItem("isDropper");
  const elapsedSeconds = sessionStorage.getItem("elapsedSeconds");
  const totalSize = sessionStorage.getItem("totalSize");
  const fileName = sessionStorage.getItem("fileName");

  const ok = Boolean(isDropper && elapsedSeconds && totalSize && fileName);

  useEffect(() => {
    if (!ok) {
      window.location.hash = "";
    }
  }, [ok]);

  if (!ok) {
    // will go to # soon, anyways
    return <></>;
  }

  // isDropper is already a string
  const elapsed = JSON.parse(elapsedSeconds);
  const size = JSON.parse(totalSize);

  const summary =
    (isDropper === "true" ? "Sent " : "Received ") +
    fileName +
    ` (${bytesToString(size)}) in ${secondsToString(elapsed)}.`;

  return (
    <AppWindow>
      <div className="flex flex-col items-center">
        <img src="/success.png" className="mb-2" />
        <p className="text-2xl font-semibold">Done!</p>
        <p className="text-sm mb-4">{summary}</p>
        <Button as="a" href="/#" scale="lg" className="mb-1">
          End Session
        </Button>
      </div>
    </AppWindow>
  );
}
