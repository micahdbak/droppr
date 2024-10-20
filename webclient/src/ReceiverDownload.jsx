// ReceiverDownload.jsx

import React, { useState, useEffect } from 'react';

import { AppWindow, Page, Header } from './components';
import { bytesToHRString } from './core';

function FileRow(props) {
  const { index, name, size, type, href } = props;

  return (
    <tr className={index%2 === 0 ? "bg-gray-100 rounded" : undefined}>
      <td className="text-sm text-nowrap whitespace-nowrap text-ellipsis max-w-16 overflow-hidden">
        <a className="text-blue-400 hover:underline" href={href} download={name} target="_blank">
          {name}
        </a>
      </td>
      <td className="text-sm text-nowrap text-gray-400 w-20">
        {bytesToHRString(size)}
      </td>
    </tr>
  );
}

export function ReceiverDownload() {
  let elapsedSeconds = sessionStorage.getItem('elapsedSeconds');
  let totalSize = sessionStorage.getItem('totalSize');
  let download = sessionStorage.getItem('download');

  if (elapsedSeconds === null || totalSize === null || download === null) {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
    return <></>; // blank screen
  }

  elapsedSeconds = JSON.parse(elapsedSeconds);
  totalSize = JSON.parse(totalSize);
  download = JSON.parse(download);

  const downloadSummary =
    `Received ${download.length} ${download.length === 1 ? " file" : " files"} ` +
    `(${bytesToHRString(totalSize)}) in ${Math.round(elapsedSeconds)} seconds.`;

  const onGoBack = () => {
    window.location.href = window.location.origin + "/#";
    window.location.reload();
  };

  return (
    <Page>
      <Header />
      <div className="flex flex-col gap-2 justify-center align-center">
        <AppWindow justWindow={true}>
          <div className="flex flex-col items-start justify-start w-full h-full overflow-y-auto">
            <p className="font-bold">All done!</p>
            <p className="text-sm mb-4">{downloadSummary}</p>
            <table className="table-fixed w-full">
              <thead>
                <tr className="bg-white sticky top-0 text-sm">
                  <th className="text-left font-normal">Name</th>
                  <th className="text-left font-normal w-20">Size</th>
                </tr>
              </thead>
              <tbody>
                {download.map((file, index) =>
                  <FileRow index={index} name={file.name} size={file.size} href={file.href} />
                )}
              </tbody>
            </table>
          </div>
        </AppWindow>
        <div className="flex flex-row justify-center items-center gap-1">
          <p className="text-sm mr-2">Receive again, or send?</p>
          <button
            className="bg-gray-700 hover:bg-gray-500 text-white text-sm px-2 py-1 rounded-lg"
            onClick={onGoBack}
          >
            Go back
          </button>
        </div>
      </div>
    </Page>
  );
}