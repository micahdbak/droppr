import axios from "axios";

import { errorToString } from "@/lib";
import { BareWindow } from "@/layouts";
import { Button } from "@/components";

export function UnsafeState() {
  const cleanup = async () => {
    try {
      await axios.post("/api/cleanup");
      window.location.hash = "";
      window.location.reload(); // force a full remount
    } catch (err) {
      sessionStorage.setItem("error", errorToString(err));
      window.location.hash = "error";
    }
  };

  return (
    <BareWindow>
      <div
        className="flex flex-col items-center gap-4 text-center"
        style={{ maxWidth: "24rem" }}
      >
        <p className="text-lg font-semibold">A drop may be in progress.</p>
        <p className="text-sm text-gray-600">
          Your browser suggests a drop is already in progress.
          Continuing <b>WILL BREAK</b> an in-progress drop.
        </p>
        <p className="text-xs text-gray-400">
          (Close this tab if you changed your mind.)
        </p>
        <Button variant="danger" onClick={cleanup}>
          Continue
        </Button>
      </div>
    </BareWindow>
  );
}
