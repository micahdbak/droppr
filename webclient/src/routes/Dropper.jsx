import { useEffect, useState } from "react";
import axios from "axios";

import { dropFile, errorToString, bytesToString } from "@/lib";
import { AppWindow, TransferWindow } from "@/layouts";
import { DropCode, DropLink, FilePicker, QRCode, Spinner } from "@/components";

const STATE_WAITING = 0;
const STATE_CONNECTING = 1;
const STATE_TRANSFER = 2;

export function Dropper() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [dropCode, setDropCode] = useState(null);
  const [turnServers, setTurnServers] = useState([]);
  const [file, setFile] = useState(null);

  const [bytesSent, setBytesSent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [state, setState] = useState(STATE_WAITING);

  // effect is run when the file state is changed
  useEffect(() => {
    // NOTE: when file is changed, isWaiting is set to true

    if (file !== null) {
      const registerDrop = async () => {
        try {
          // fileinfo to send to the server
          const data = {
            name: file.name,
            size: file.size,
            type: file.type,
          };

          // will throw an error if not able to register
          const res = await axios.post("/api/register", data, {
            headers: { "Content-Type": "application/json" },
          });
          setDropCode(res.data.drop_code);
          setTurnServers(res.data.turn ? [res.data.turn] : []);
          setIsWaiting(false); // stop displaying waiting screen
        } catch (err) {
          sessionStorage.setItem("error", err.toString());
          window.location.hash = "error";
          return;
        }
      };

      registerDrop();
    }
  }, [file]);

  const addEventListeners = (dropper) => {
    let checkDropperInterval = null;

    dropper.addEventListener("error", () => {
      sessionStorage.setItem("error", errorToString(dropper.error));
      window.location.hash = "error";
    });

    dropper.addEventListener("connected", () => {
      setState(STATE_TRANSFER);
      const startTime = Date.now(); // for checkDropperInterval

      checkDropperInterval = setInterval(() => {
        const _bytesSent = dropper.bytesSent;
        setBytesSent(_bytesSent);

        const msElapsed = Date.now() - startTime;
        const elapsedSeconds = msElapsed / 1000;
        const avgSecondsPerByte = elapsedSeconds / _bytesSent;
        setRemainingSeconds(
          Math.ceil((file.size - _bytesSent) * avgSecondsPerByte),
        );

        // for Success.jsx
        sessionStorage.setItem(
          "elapsedSeconds",
          JSON.stringify(Math.ceil(elapsedSeconds)),
        );
      }, 100); // 100ms
    });

    dropper.addEventListener("disconnected", () => {
      clearInterval(checkDropperInterval);
      setState(STATE_CONNECTING);
      // will reconnect automatically
    });

    dropper.addEventListener("done", async () => {
      clearInterval(checkDropperInterval);
      await axios.post("/api/cleanup");
      window.location.hash = "success";
    });
  };

  // once the drop is registered, start dropping the file
  useEffect(() => {
    if (dropCode === null) return;

    // for Success.jsx
    sessionStorage.setItem("isDropper", "true");
    sessionStorage.setItem("totalSize", file.size.toString());
    sessionStorage.setItem("fileName", file.name);

    try {
      // returns a singleton; safe to re-call
      dropFile(file, turnServers, addEventListeners);
    } catch (err) {
      sessionStorage.setItem("error", errorToString(err));
      window.location.hash = "error";
    }

    // NOTE: this intentionally captures initial values, and only runs once
    // (when the drop is registered); so, disable the eslint warn
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropCode]);

  // landing page

  const handleFile = (selected) => {
    setFile(selected);
    setIsWaiting(true); // should register before displaying dropper
  };

  const handleReceive = (code) => {
    if (!/^([a-zA-Z0-9]{6,6})$/.test(code)) {
      sessionStorage.setItem("error", `The drop code "${code}" is invalid.`);
      window.location.hash = "error";
    } else {
      window.location.hash = `#${code}`;
    }
  };

  // welcome/home screen
  if (file === null) {
    return (
      <AppWindow>
        <div className="flex flex-col items-center">
          <img src="/drop_files.png" className="mb-4" />
          <p className="text-lg">
            droppr is <b>P2P file transfer</b>
          </p>
          <p className="text-sm mb-4 text-gray-500">
            (Best used with <u>Chrome</u> browsers)
          </p>
          <FilePicker onFile={handleFile} />
        </div>
        <div
          className="absolute flex w-full justify-center items-center"
          style={{
            bottom: "16px",
            left: "50%",
            transform: "translateX(-50%)",
          }}
        >
          <DropCode onReceive={handleReceive} />
        </div>
      </AppWindow>
    );
  }

  // display spinner while waiting for file to be registered with API
  if (isWaiting === true) {
    return (
      <AppWindow>
        <Spinner />
      </AppWindow>
    );
  }

  // perform the drop
  switch (state) {
    case STATE_WAITING: {
      const downloadLink = window.location.origin + "/#" + dropCode;

      return (
        <AppWindow>
          <img
            src="/hourglass.gif"
            className="w-full h-20 mb-4 object-contain"
          />

          <p className="text-xl mb-1">Your drop code is:</p>
          <div className="flex items-center gap-2">
            <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">
              {dropCode}
            </p>
            <QRCode url={downloadLink} logoUrl="/drop_files_square.png" />
          </div>

          <p className="text-xs mb-4 text-gray-500">
            {bytesToString(file.size)}, {file.name}
          </p>

          <DropLink value={downloadLink} />
        </AppWindow>
      );
    }

    case STATE_TRANSFER:
      return (
        <TransferWindow
          verb="Dropping"
          fileName={file.name}
          bytesTransferred={bytesSent}
          totalSize={file.size}
          remainingSeconds={remainingSeconds}
        />
      );

    default: // STATE_CONNECTING
      return (
        <AppWindow>
          <Spinner />
        </AppWindow>
      );
  }
}
