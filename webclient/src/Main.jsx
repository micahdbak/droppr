import React, { useEffect, useState } from 'react';
import axios from 'axios';
import * as uuid from 'uuid';

import { Page, Header } from './components';
import { Waiting } from './Waiting.jsx';
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
      window.location.replace(window.location.origin + "/#error"); // force refresh
    } else {
      window.location.replace(window.location.origin + `#${code}`); // force refresh
    }
  }

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center gap-2 w-64 h-64 rounded-full mb-16">
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
            className="rounded-lg font-mono px-4 py-2 ring-inset ring-1 ring-gray-400 focus:outline-none focus:ring-2"
            style={{ width: "calc(6ch + 2rem)" }}
            type="text"
            placeholder="A1B2C3"
            minLength="6"
            maxLength="6"
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