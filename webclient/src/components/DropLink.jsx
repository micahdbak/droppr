import { useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";

/**
 * @param {object} props
 * @param {string} props.value
 */
export function DropLink(props) {
  const { value } = props;

  const [copied, setCopied] = useState(false);
  const ref = useRef(null);

  const copy = () => {
    navigator.clipboard.writeText(value);

    // visually select the text for feedback
    if (ref.current) {
      ref.current.select();
      ref.current.setSelectionRange(0, value.length);
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 1000); // 1 second
  };

  return (
    <div className="flex flex-row gap-2 mb-4">
      <input
        ref={ref}
        type="text"
        className="font-mono text-sm focus:outline-none"
        style={{ width: `${value.length}ch` }}
        value={value}
        readOnly={true}
      />
      {copied ? (
        <FontAwesomeIcon icon={faCheck} />
      ) : (
        <FontAwesomeIcon
          className="cursor-pointer"
          icon={faCopy}
          onClick={copy}
        />
      )}
    </div>
  );
}
