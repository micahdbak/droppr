import { useState } from "react";

import { Button } from "./Button.jsx";
import { DropCodeInput } from "./DropCodeInput.jsx";

/**
 * @param {object} props
 * @param {(code: string) => void} props.onReceive
 */
export function DropCode(props) {
  const { onReceive } = props;

  const [code, setCode] = useState("");

  return (
    <div className="flex flex-row justify-center items-center gap-1">
      <p className="text-sm mr-2">Have a code?</p>
      <DropCodeInput value={code} onChange={(e) => setCode(e.target.value)} />
      <Button scale="sm" onClick={() => onReceive(code)}>
        Receive
      </Button>
    </div>
  );
}
