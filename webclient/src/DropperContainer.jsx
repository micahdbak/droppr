// DropperContainer.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

import { Dropper } from './core';
import { Header, LoadingBar, Page } from './components';
import { bytesToHRString } from './utils.js';

export function DropperContainer(props) {
  const { files, dropId } = props;
  
  // before transfer
  const [downloadLinkCopied, setDownloadLinkCopied] = useState(false);
  const [dots, setDots] = useState("...");

  // during transfer
  const [state, setState] = useState('waiting');
  const [totalSize, setTotalSize] = useState(1);
  const [bytesSent, setBytesSent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    let _files = [];
    let _totalSize = 0;

    files.forEach(file => {
      if (file.size > 0) {
        _totalSize += file.size;
        _files.push(file);
      }
      // else, skip
    });

    setTotalSize(_totalSize);
    
    const _dropper = new Dropper(_files);

    const dotDotDotInterval = setInterval(() => {
      setDots((_dots) => {
        return _dots + ".";
      });
    }, 3141);

    _dropper.addEventListener('connected', () => {
      setState('connected');
      clearInterval(dotDotDotInterval);

      const startTime = Date.now();

      // do this until done
      setInterval(() => {
        const _bytesSent = _dropper.bytesSent;

        const secondsElapsed = (Date.now() - startTime) / 1000;
        const averageSPB = secondsElapsed / _bytesSent; // SPB = seconds per byte
        const _remainingSeconds = (_totalSize - _bytesSent) * averageSPB;

        setBytesSent(_bytesSent);
        setRemainingSeconds(Math.round(_remainingSeconds));
      }, 250); // 4 times per second
    });
    _dropper.addEventListener('disconnected', () => { setState('disconnected'); });
    _dropper.addEventListener('failed', () => {
      sessionStorage.setItem('error', 'Something broke.');
      window.location.replace(window.location.origin + "/#error"); // force refresh
    });
    _dropper.addEventListener('done', async () => {
      await axios.post('/api/cleanup');
      window.location.replace(window.location.origin + "/#success"); // force refresh
    });

    return () => {
      clearInterval(dotDotDotInterval);
      // it is in vain that we release the dropper
    }
  }, []);

  // show drop ID and prompt user to copy
  if (state === "waiting") {
    const downloadLink = window.location.origin + "/#" + dropId;

    const copyDownloadLink = () => {
      const linkElement = document.querySelector('input[type="text"]');
      linkElement.select();
      linkElement.setSelectionRange(0, downloadLink.length);

      // copy to clipboard
      navigator.clipboard.writeText(downloadLink);

      setDownloadLinkCopied(true);
      setTimeout(() => {
        setDownloadLinkCopied(false);
      }, 1000); // 1 second
    };

    return (
      <Page>
        <Header />
        <div className="flex flex-col justify-center items-start">
          <p className="text-lg">Your drop code is:</p>
          <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">{dropId}</p>
          <p className="text-xs mb-4 text-gray-500">{files.length} {files.length > 1 ? "files" : "file"}, {bytesToHRString(totalSize)} bytes.</p>
          <p className="text-xs">Download link:</p>
          <div className="flex flex-row gap-2 mb-4">
            <input
              type="text"
              className="font-mono font-bold text-sm focus:outline-none"
              style={{ width: `${downloadLink.length}ch` }}
              value={downloadLink}
              readonly
            />
            {downloadLinkCopied ? (
              <FontAwesomeIcon icon={faCheck} />
            ) : (
              <FontAwesomeIcon className="cursor-pointer" icon={faCopy} onClick={copyDownloadLink} />
            )}
          </div>
          <p className="text-xs text-gray-500 mb-8 w-72">
            Enter {dropId} at <a className="text-blue-400 hover:underline" href={window.location.origin}>{window.location.origin}</a> or
            open the above download link to
            receive this drop.
          </p>
          <p className="text-xl mb-16 w-72">
            Waiting&nbsp;for&nbsp;receiver{dots}
          </p>
        </div>
      </Page>
    );
  }

  const percentTransferred = (100 * bytesSent / totalSize).toFixed(1);

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-start">
        <p className="text-2xl mb-2">Dropping {files.length} {files.length > 1 ? "files" : "file"}</p>
        <p className="text-base">{percentTransferred}% done</p>
        <LoadingBar bytes={bytesSent} total={totalSize} />
        <p className="text-sm text-gray-500 mb-3">{bytesToHRString(bytesSent)} of {bytesToHRString(totalSize)}</p>
        <p className="text-base">{remainingSeconds} {remainingSeconds === 1 ? "second" : "seconds"} remaining</p>
      </div>
    </Page>
  );
}