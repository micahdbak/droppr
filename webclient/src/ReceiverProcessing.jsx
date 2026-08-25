import { AppWindow } from "./components";
import { bytesToString, secondsToString } from "./core";

/**
 * @param {object} props
 * @param {number} props.elapsedSeconds
 * @param {string} props.fileName
 * @param {boolean} props.isCleanUp
 * @param {number} props.progress
 * @param {number} props.totalSize
 */
export function ReceiverProcessing(props) {
  const { elapsedSeconds, fileName, isCleanUp, totalSize } = props;

  return (
    <AppWindow>
      <img src="/hourglass.gif" className="w-full h-20 mb-4 object-contain" />
      <p className="text-xl">
        {isCleanUp ? "Cleaning up..." : "Processing..."}
      </p>
      <p className="text-lg mb-2">
        Received {fileName} {bytesToString(totalSize)} in{" "}
        {secondsToString(elapsedSeconds)}.
      </p>
      <p className="text-sm">{fileName} will be ready in just a moment.</p>
    </AppWindow>
  );
}
