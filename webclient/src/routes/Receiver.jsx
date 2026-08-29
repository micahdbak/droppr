import { useState, useEffect } from "react";
import axios from "axios";

import {
  receiveFile,
  errorToString,
  bytesToString,
  secondsToString,
} from "@/lib";
import { AppWindow, TransferWindow } from "@/layouts";
import { Button, Spinner } from "@/components";

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
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [state, setState] = useState(STATE_CONFIRM);

  // peek at the file info for the confirm screen
  useEffect(() => {
    let cancelled = false;

    const peekFile = async () => {
      try {
        const res = await axios.get("/api/peek/" + code.toUpperCase());

        if (!cancelled) {
          setFile(res.data.file);
        }
      } catch (err) {
        if (!cancelled) {
          sessionStorage.setItem("error", errorToString(err));
        }
      }
    };

    peekFile();

    return () => {
      cancelled = true;
    };
  }, [code]);

  const addEventListeners = (receiver) => {
    let checkReceiverInterval = null;
    let startTime = null;
    let endTime = null;

    receiver.addEventListener("error", () => {
      sessionStorage.setItem("error", errorToString(receiver.error));
      window.location.hash = "error";
    });

    receiver.addEventListener("connected", () => {
      setState(STATE_TRANSFER); // show transfer screen
      startTime = Date.now(); // for checkReceiverInterval

      checkReceiverInterval = setInterval(() => {
        setState((_state) => {
          // only update transfer stats while transferring
          if (_state !== STATE_PROCESSING && _state !== STATE_CLEANUP) {
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

  const onGoBack = () => {
    window.location.hash = "";
  };

  switch (state) {
    case STATE_CONFIRM:
      return (
        <AppWindow>
          <img src="/confirm.png" className="w-full h-20 mb-4 object-contain" />

          <p className="text-xl mb-2">Does this look right?</p>
          <p
            className="text-2xl bg-gray-200 px-2 rounded-lg whitespace-nowrap
              text-ellipsis mb-1"
            style={{
              maxWidth: "18rem",
              overflow: "hidden",
              textOverflow: "text-ellipsis",
            }}
          >
            {file.name}
          </p>
          <p className="text-xs mb-4 text-gray-500">
            <b>{bytesToString(file.size)}</b>, drop code is <b>{code}</b>
          </p>

          <div className="flex flex-row gap-1">
            <Button onClick={onConfirm}>Receive</Button>
            <Button variant="secondary" onClick={onGoBack}>
              Go back
            </Button>
          </div>
        </AppWindow>
      );

    case STATE_TRANSFER:
      return (
        <TransferWindow
          verb="Receiving"
          fileName={file.name}
          bytesTransferred={bytesReceived}
          totalSize={file.size}
          remainingSeconds={remainingSeconds}
        />
      );

    case STATE_PROCESSING:
    case STATE_CLEANUP:
      return (
        <AppWindow>
          <img
            src="/hourglass.gif"
            className="w-full h-20 mb-4 object-contain"
          />
          <p className="text-xl">
            {state === STATE_CLEANUP ? "Cleaning up..." : "Processing..."}
          </p>
          <p className="text-lg mb-2">
            Received {file.name} {bytesToString(file.size)} in{" "}
            {secondsToString(elapsedSeconds)}.
          </p>
          <p className="text-sm">{file.name} will be ready in just a moment.</p>
        </AppWindow>
      );

    default: // STATE_CONNECTING
      return (
        <AppWindow>
          <Spinner />
        </AppWindow>
      );
  }
}
