// DropperWaiting.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { Page, Header, AppWindow } from './components';
import { bytesToHRString } from './core';

export function DropperWaiting(props) {
  const { code, totalSize, numFiles } = props;

  const [downloadLinkCopied, setDownloadLinkCopied] = useState(false);

  const downloadLink = window.location.origin + "/#" + code;

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
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow titleText="Waiting for receiver..." imgSrc="waiting.gif">
          <div className="flex flex-col items-start">
            <p className="text-lg">Your drop code is:</p>
            <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">{code}</p>
            <p className="text-xs mb-4 text-gray-500">{numFiles} {numFiles === 1 ? "file" : "files"}, {bytesToHRString(totalSize)}.</p>
            <p className="text-xs">Download link:</p>
            <div className="flex flex-row gap-2 mb-4">
              <input
                type="text"
                className="font-mono font-bold text-sm focus:outline-none"
                style={{ width: `${downloadLink.length}ch` }}
                value={downloadLink}
                readOnly={true}
              />
              {downloadLinkCopied ? (
                <FontAwesomeIcon icon={faCheck} />
              ) : (
                <FontAwesomeIcon className="cursor-pointer" icon={faCopy} onClick={copyDownloadLink} />
              )}
            </div>
          </div>
        </AppWindow>
        <p className="text-center text-sm text-red-400">
          <FontAwesomeIcon icon={faTriangleExclamation} />
          &emsp;Don't close this page.
        </p>
      </div>
    </Page>
  );
}