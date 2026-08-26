import { useState } from "react";
import axios from "axios";

import { receiveFile, errorToString } from "@/lib";
import {
  SpinningWheel,
  ReceiverConfirm,
  ReceiverProcessing,
  ReceiverTransfer,
} from "@/components";

const STATE_CONFIRM = 0;
const STATE_CONNECTING = 1;
const STATE_TRANSFER = 2;
const STATE_PROCESSING = 3;
const STATE_CLEANUP = 4;

export function Receiver(props) {
  const { code } = props;

  const [bytesReceived, setBytesReceived] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(1);
  const [file, setFile] = useState({
    name: "tmp.bin",
    size: 0,
    type: "application/octet-stream",
    href: "",
  });
  const [processingProgress, setProcessingProgress] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [state, setState] = useState(STATE_CONFIRM);

  const addEventListeners = (receiver) => {
    let checkReceiverInterval = null;
    let startTime = null;
    let endTime = null;

    receiver.addEventListener("error", () => {
      sessionStorage.setItem("error", errorToString(receiver.error));
      window.location.hash = "error";
    });

    receiver.addEventListener("connected", () => {
      setState(STATE_TRANSFER); // show ReceiverTransfer.jsx
      startTime = Date.now(); // for checkReceiverInterval

      checkReceiverInterval = setInterval(() => {
        setState((_state) => {
          // in this case, only update the processingProgress
          if (_state === STATE_PROCESSING || _state === STATE_CLEANUP) {
            setProcessingProgress(receiver.processingProgress);
          } else {
            // otherwise, update bytesReceived, remainingSeconds, elapsedSeconds
            const _bytesReceived = receiver.bytesReceived;
            setBytesReceived(_bytesReceived);

            const msElapsed = Date.now() - startTime;
            const _elapsedSeconds = msElapsed / 1000;
            setElapsedSeconds(Math.ceil(_elapsedSeconds));

            const avgSecondsPerByte = _elapsedSeconds / _bytesReceived;
            const _remainingSeconds =
              (receiver.file.size - _bytesReceived) * avgSecondsPerByte;
            setRemainingSeconds(Math.ceil(_remainingSeconds));

            // for Success.jsx
            sessionStorage.setItem(
              "elapsedSeconds",
              Math.ceil(_elapsedSeconds),
            );
          }

          return _state;
        });
      }, 100); // 100ms
    });

    receiver.addEventListener("disconnected", () => {
      clearInterval(checkReceiverInterval);
      setState(STATE_CONNECTING);
    });

    receiver.addEventListener("processing", async () => {
      endTime = Date.now();
      setState(STATE_PROCESSING);
    });

    receiver.addEventListener("cleanup", async () => {
      setState(STATE_CLEANUP);
    });

    receiver.addEventListener("done", async () => {
      clearInterval(checkReceiverInterval);

      if (endTime === null) {
        endTime = Date.now();
      }

      if (startTime !== null) {
        sessionStorage.setItem(
          "elapsedSeconds",
          Math.max(1, Math.ceil((endTime - startTime) / 1000)),
        );
      }

      await axios.post("/api/cleanup");
      window.location.hash = "success";
    });
  };

  const onConfirm = async () => {
    try {
      setState(STATE_CONNECTING);

      // returns a singleton; safe to re-call
      const receiver = await receiveFile(code.toUpperCase(), addEventListeners);

      const _file = receiver.file;
      setFile(_file);

      // will be used by Success.jsx
      sessionStorage.setItem("isDropper", "false");
      sessionStorage.setItem("totalSize", _file.size);
      sessionStorage.setItem("fileName", _file.name);
    } catch (err) {
      sessionStorage.setItem("error", errorToString(err));
      window.location.hash = "error";
    }
  };

  switch (state) {
    case STATE_CONFIRM:
      return <ReceiverConfirm code={code} onConfirm={onConfirm} />;

    case STATE_PROCESSING:
    case STATE_CLEANUP:
      return (
        <ReceiverProcessing
          elapsedSeconds={elapsedSeconds}
          fileName={file.name}
          isCleanUp={state === STATE_CLEANUP}
          progress={processingProgress}
          totalSize={file.size}
        />
      );

    case STATE_TRANSFER:
      return (
        <ReceiverTransfer
          bytesReceived={bytesReceived}
          fileName={file.name}
          remainingSeconds={remainingSeconds}
          totalSize={file.size}
        />
      );

    default: // STATE_CONNECTING
      return <SpinningWheel />;
  }
}
