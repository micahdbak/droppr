import axios from "axios";

import { errorToString } from "./core";

export function ExistingCookies() {
  const onContinue = async () => {
    try {
      await axios.post("/api/cleanup");
      window.location.reload();
    } catch (err) {
      sessionStorage.setItem("error", errorToString(err));

      // go to ShowError.jsx
      window.location.href = window.location.origin + "/#error";
      window.location.reload();
    }
  };

  return (
    <>
      <p>Your browser suggests a drop is already in progress.</p>
      <p>Continuing WILL BREAK an in progress drop in another tab.</p>
      <p>(Close this tab if you changed your mind.)</p>
      <button onClick={onContinue}>Continue</button>
    </>
  );
}
