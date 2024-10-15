import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { Page, Header } from './components';
import { Waiting } from './Waiting.jsx';
import { DropperContainer } from './DropperContainer.jsx';

export function Main() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [dropId, setDropId] = useState(null);
  const [files, setFiles] = useState([]);

  // effect is run when the files state is changed
  useEffect(() => {
    // NOTE: when files is set as submitted, isWaiting is also set to true

    if (files.length > 0) {
      const registerDrop = async () => {
        try {
          // will throw an error if not able to register
          const res = await axios.post("/api/register");
          setDropId(res.data);
          setIsWaiting(false); // stop displaying waiting screen
        } catch (err) {
          sessionStorage.setItem('error', err.toString())
          window.location.replace(window.location.origin + "/#error"); // force refresh
        }
      };

      registerDrop();
    }
  }, [files]); 

  // display waiting screen if waiting for a promise
  if (isWaiting === true) {
    return <Waiting />;
  }

  // not waiting, and is dropper; display dropper container
  if (files.length) {
    return <DropperContainer files={files} dropId={dropId} />
  }

  // landing page

  const handleFiles = (event) => {
    setFiles(Array.from(event.target.files));
    setIsWaiting(true); // should register before displaying dropper
  };

  const handleReceive = () => {
    const dropId = document.querySelector('input[type="text"]').value;

    if (!/^([a-zA-Z0-9]{6,6})$/.test(dropId)) {
      sessionStorage.setItem('error', `The drop ID "${dropId}" is invalid.`)
      window.location.replace(window.location.origin + "/#error"); // force refresh
    } else {
      window.location.replace(window.location.origin + `#${dropId}`); // force refresh
    }
  }

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center gap-2 bg-gray-200 w-64 h-64 rounded-full mb-16">
        <input type="file" onChange={handleFiles} className="hidden" multiple />
        <button
          className="bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-lg"
          onClick={() => document.querySelector('input[type="file"]').click()}
        >
          Send Files
        </button>
        <p>or</p>
        <div className="flex flex-row justify-center items-center gap-2">
          <input
            className="rounded-lg font-mono px-4 py-2 focus:outline-none focus:ring focus:border-blue-300"
            style={{ width: "calc(6ch + 2rem)" }}
            type="text"
            placeholder="A1B2C3"
          />
          <button
            className="bg-blue-400 hover:bg-blue-300 text-white px-4 py-2 rounded-lg"
            onClick={handleReceive}
          >
            Receive
          </button>
        </div>
      </div>
    </Page>
  );
}