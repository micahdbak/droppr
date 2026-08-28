import { useRef } from "react";

import { Button } from "./Button.jsx";

/**
 * @param {object} props
 * @param {(file: File) => void} props.onFile
 * @param {string} [props.label]
 */
export function FilePicker(props) {
  const { onFile, label = "Choose File" } = props;

  const ref = useRef(null);

  const open = () => ref.current?.click();

  return (
    <>
      <input
        ref={ref}
        type="file"
        onChange={(event) => onFile(event.target.files[0])}
        className="hidden"
      />
      <Button scale="lg" className="mb-8" onClick={open}>
        {label}
      </Button>
    </>
  );
}
