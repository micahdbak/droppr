import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';
import { bytesToHRString } from './utils';

export function DropperWaiting(props) {
  const { code, totalSize, numFiles } = props;

  const [dots, setDots] = useState('...');
  const [downloadLinkCopied, setDownloadLinkCopied] = useState(false);

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(_dots => _dots + '.');
    }, 3000); // every 3 seconds

    return () => {
      clearInterval(dotsInterval);
    }
  }, []);

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
      <div className="flex flex-col justify-center items-start">
        <p className="text-lg">Your drop code is:</p>
        <p className="text-6xl font-mono bg-gray-200 px-2 rounded-lg">{code}</p>
        <p className="text-xs mb-4 text-gray-500">{numFiles} {numFiles === 1 ? "file" : "files"}, {bytesToHRString(totalSize)} bytes.</p>
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
        <p className="text-xs text-gray-500 mb-8 w-72">
          Enter {code} at <a className="text-blue-400 hover:underline" href={window.location.origin}>{window.location.origin}</a> or
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