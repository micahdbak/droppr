// Download.jsx

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheck } from '@fortawesome/free-solid-svg-icons';

import { Page, Header } from './components';
import { bytesToHRString } from './utils';

function FileRow(props) {
  const { name, size, href } = props;

  return (
    <tr className="hover:bg-gray-100">
      <td className="text-blue-400 hover:underline">
        <a href={href} download={name}>
          {name}
        </a>
      </td>
      <td className="pl-4 text-gray-500">
        {bytesToHRString(size)}
      </td>
    </tr>
  );
}

export function Download() {
  const [download, setDownload] = useState([]);

  useEffect(() => {
    setDownload(JSON.parse(sessionStorage.getItem('download')));
  }, []);

  return (
    <Page>
      <Header />
      <div className="flex flex-col justify-center items-center">
        <FontAwesomeIcon className="text-4xl text-green-500 mb-2" icon={faCheck} />
        <p className="text-2xl mb-1">Received!</p>
        <p className="text-sm mb-4">Download your files below.</p>
        <table className="table-auto mb-8">
          <tr className="text-left">
            <th className="font-normal">File name</th>
            <th className="font-normal pl-4">Size</th>
          </tr>
          {download.map((file) =>
            <FileRow name={file.name} size={file.size} href={file.href} />
          )}
        </table>
        <p className="text-sm text-gray-500">
          Finished? <a className="text-blue-400 hover:underline" href="/#">Go back</a>.
        </p>
      </div>
    </Page>
  );
}