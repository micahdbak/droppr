// DropperWaiting.jsx

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons';

import { AppWindow } from './components';
import { bytesToString } from './core';

/**
 * @param {object} props
 * @param {string} props.code
 * @param {string} props.fileName
 * @param {number} props.totalSize
 */
export function DropperWaiting(props) {
  const { code, fileName, totalSize } = props;

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
    <AppWindow>
      <img src="/hourglass.gif" className="w-full h-20 mb-4 object-contain" />
      
      <p className="text-xl mb-1">Your drop code is:</p>
      <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">{code}</p>
      <p className="text-xs mb-4 text-gray-500">{bytesToString(totalSize)}, {fileName}</p>

      <div className="flex flex-row gap-2 mb-4">
        <input
          type="text"
          className="font-mono text-sm focus:outline-none"
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
    </AppWindow>
  );
}
