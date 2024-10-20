// Main.jsx

import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as uuid from 'uuid';

import { AppWindow, Page, Header } from './components';
import { DropperContainer } from './DropperContainer.jsx';

export function Main() {
  const [isWaiting, setIsWaiting] = useState(false);
  const [dropCode, setDropCode] = useState(null);
  const [files, setFiles] = useState([]);
  const [labels, setLabels] = useState([]);

  // effect is run when the files state is changed
  useEffect(() => {
    // NOTE: when files is set as submitted, isWaiting is also set to true

    if (files.length > 0) {
      const registerDrop = async () => {
        try {
          // generate data channel labels for the files
          const _labels = [];
          for (let i = 0; i < files.length; i++) {
            _labels.push(uuid.v4()); // generate labels for each file
          }
          setLabels(_labels);

          // fileinfo to send to the server
          const data = files.map((file, i) => {
            return {
              label: _labels[i],
              name: file.name,
              size: file.size,
              type: file.type
            };
          });

          // will throw an error if not able to register
          const res = await axios.post("/api/register", data, {
            headers: { 'Content-Type': 'application/json' }
          });
          setDropCode(res.data.drop_code);
          setIsWaiting(false); // stop displaying waiting screen
        } catch (err) {
          sessionStorage.setItem('error', err.toString())
          window.location.href = window.location.origin + "/#error";
          window.location.reload();
        }
      };

      registerDrop();
    }
  }, [files]); 

  // display waiting screen if waiting for a promise
  if (isWaiting === true) {
    return <></>; // blank screen
  }

  // not waiting, and is dropper; display dropper container
  if (files.length) {
    return <DropperContainer files={files} labels={labels} code={dropCode} />
  }

  // landing page

  const handleFiles = (event) => {
    let _files = [];

    // don't drop any files with a size of zero
    Array.from(event.target.files).forEach(file => {
      if (file.size > 0) {
        _files.push(file);
      }
      // else, skip
    });
    
    setFiles(_files);
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
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText="Have files to send?" imgSrc="drop_files.png">
          <p className="text-lg">Drop Files</p>
          <p className="mb-1">or</p>
          <input type="file" onChange={handleFiles} className="hidden" multiple />
          <button
            className="text-lg bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-xl"
            onClick={() => document.querySelector('input[type="file"]').click()}
          >
            Browse Files
          </button>
        </AppWindow>
        <div className="flex flex-row justify-center items-center gap-1">
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
      </div>
    </Page>
  );
}