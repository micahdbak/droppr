import { bytesToString, secondsToString } from "@/lib";

import { ProgressBar } from "@/components";
import { AppWindow } from "./AppWindow.jsx";

/**
 * @param {object} props
 * @param {string} props.verb - "Dropping" or "Receiving"
 * @param {string} props.fileName
 * @param {number} props.bytesTransferred
 * @param {number} props.totalSize
 * @param {number} props.remainingSeconds
 */
export function TransferWindow(props) {
  const { verb, fileName, bytesTransferred, totalSize, remainingSeconds } =
    props;

  const percentTransferred = Math.round((100 * bytesTransferred) / totalSize);

  return (
    <AppWindow>
      <img src="/drop.gif" className="w-full" />
      <p className="text-lg">{`${verb} ${fileName}...`}</p>
      <p className="text-base">{percentTransferred}% done</p>
      <ProgressBar percentage={percentTransferred} />
      <p className="text-sm text-gray-500 mb-3">
        {bytesToString(bytesTransferred)} of {bytesToString(totalSize)}
      </p>
      <p className="text-base">{secondsToString(remainingSeconds)} remaining</p>
    </AppWindow>
  );
}
