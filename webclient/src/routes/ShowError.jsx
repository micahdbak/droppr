import { useState, useEffect } from "react";

import { AppWindow } from "@/layouts";
import { Button } from "@/components";

export function ShowError() {
  const [error, setError] = useState("");

  useEffect(() => {
    const errStr = sessionStorage.getItem("error");
    console.log(errStr); // longer stack trace
    setError(errStr.split("\n")[0]); // just the first line (error message)
  }, []);

  return (
    <AppWindow>
      <div className="flex flex-col justify-center items-center">
        <img src="/error.png" className="mb-2" />
        <p className="text-2xl font-semibold">Error.</p>
        <p className="text-sm mb-4">{error}</p>
        <Button as="a" href="/#" scale="lg" className="mb-1">
          Go Back
        </Button>
      </div>
    </AppWindow>
  );
}
