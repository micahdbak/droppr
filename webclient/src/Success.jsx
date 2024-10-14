// Success.jsx

import React from 'react';

import { Page, Header } from './components';

export function Success(props) {
  return (
    <Page>
      <Header />
      <div className="w-64 flex flex-col justify-center items-start gap-4">
        <img src="/box.png" className="w-52 rounded-xl "></img>
        <p>All done.</p>
        <a className="text-blue-400 hover:underline" href="/#">Go back</a>
      </div>
    </Page>
  );
}