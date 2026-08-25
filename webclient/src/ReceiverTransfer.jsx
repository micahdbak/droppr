import { AppWindow, ProgressBar } from "./components";
import { bytesToString, secondsToString } from "./core";

/**
 * @param {object} props
 * @param {number} props.bytesReceived
 * @param {string} props.fileName
 * @param {number} props.remainingSeconds
 * @param {number} props.totalSize
 */
export function ReceiverTransfer(props) {
  const { bytesReceived, fileName, remainingSeconds, totalSize } = props;

  const percentTransferred = Math.round((100 * bytesReceived) / totalSize);

  return (
    <AppWindow>
      <img src="/drop.gif" className="w-full" />
      <p className="text-lg">{`Receiving ${fileName}...`}</p>
      <p className="text-base">{percentTransferred}% done</p>
      <ProgressBar percentage={percentTransferred} />
      <p className="text-sm text-gray-500 mb-3">
        {bytesToString(bytesReceived)} of {bytesToString(totalSize)}
      </p>
      <p className="text-base">{secondsToString(remainingSeconds)} remaining</p>
    </AppWindow>
  );
}
