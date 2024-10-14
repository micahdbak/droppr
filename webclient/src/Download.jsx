// Download.jsx

import React, { useState, useEffect } from 'react';

import { Page, Header } from './components';

export function Download() {
  const [download, setDownload] = useState([]);

  useEffect(() => {
    setDownload(sessionStorage.getItem('download'));
  }, []);

  return (
    <Page>
      <Header />
      <div className="w-64 flex flex-col justify-center items-start gap-4">
        <img src="/box.png" className="w-52 rounded-xl "></img>
        <p>{JSON.stringify(download)}</p>
        <a className="text-blue-400 hover:underline" href="/#">Go back</a>
      </div>
    </Page>
  );
}