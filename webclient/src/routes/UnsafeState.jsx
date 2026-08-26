import axios from "axios";

import { errorToString } from "@/lib";

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
    <>
      <p>Your browser suggests a drop is already in progress.</p>
      <p>Continuing WILL BREAK an in progress drop in another tab.</p>
      <p>(Close this tab if you changed your mind.)</p>
      <button onClick={cleanup}>Continue</button>
    </>
  );
}
