// Main.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { AppWindow } from './components';
import { DropperContainer } from './DropperContainer.jsx';

export function Main() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [dropCode, setDropCode] = useState(null);
  const [file, setFile] = useState(null);

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
            type: file.type
          };

          // will throw an error if not able to register
          const res = await axios.post("/api/register", data, {
            headers: { 'Content-Type': 'application/json' }
          });
          setDropCode(res.data.drop_code);
          setIsWaiting(false); // stop displaying waiting screen
        } catch (err) {
          sessionStorage.setItem('error', err.toString());
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        }
      };

      registerDrop();
    }
  }, [file]); 

  // display waiting screen if waiting for a promise
  if (isWaiting === true) {
    return <></>; // blank screen
  }

  // not waiting, and is dropper; display dropper container
  if (file !== null) {
    return <DropperContainer file={file} code={dropCode} />
  }

  // landing page

  const handleFile = (event) => {
    setFile(event.target.files[0]);
    setIsWaiting(true); // should register before displaying dropper
  };

  const handleReceive = () => {
    const code = document.querySelector('input[type="text"]').value;

    if (!/^([a-zA-Z0-9]{6,6})$/.test(code)) {
      sessionStorage.setItem('error', `The drop code "${code}" is invalid.`)
      window.location.href = window.location.origin + "/#error";
      window.location.reload();
    } else {
      window.location.href = window.location.origin + `#${code}`;
      window.location.reload();
    }
  }

  return (
    <AppWindow>
      <div className="flex flex-col items-center">
        <img className="mb-4" src="drop_files.png" />
        <p className="text-lg">droppr is <b>P2P file transfer</b></p>
        <p className="text-sm mb-4 text-gray-500">(Best used with <u>Chrome</u> browsers)</p>
        <input type="file" onChange={handleFile} className="hidden" />
        <button
          type="button"
          className="text-lg bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-xl mb-8"
          onClick={() => document.querySelector('input[type="file"]').click()}
        >
          Choose File
        </button>
      </div>
      <div
        className="absolute flex w-full flex-row justify-center items-center gap-1"
        style={{ bottom: '16px', left: '50%', transform: 'translateX(-50%)' }}
      >
        <p className="text-sm mr-2">Have a code?</p>
        <input
          className="rounded-lg font-mono text-sm px-2 py-1 ring-inset ring-1 ring-gray-400 focus:outline-none focus:ring-2"
          style={{ width: "calc(6ch + 1rem)" }}
          type="text"
          placeholder="A1B2C3"
          minLength="6"
          maxLength="6"
        />
        <button
          className="bg-gray-700 hover:bg-gray-500 text-white text-sm px-2 py-1 rounded-lg"
          onClick={handleReceive}
        >
          Receive
        </button>
      </div>
    </AppWindow>
  );
}
