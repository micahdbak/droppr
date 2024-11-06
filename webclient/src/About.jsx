// About.jsx

import React from 'react';

import { Page, Header } from './components';

export function About() {
  return (
    <Page>
      <Header />
      <div className="w-64 flex flex-col justify-center items-start gap-4">
        <img src="/box.png" className="w-52 rounded-xl "></img>
        <p>Brought to you by <u>Micah Baker</u>, <u>Nakul Bansal</u>, <u>Johnny Deng</u>, and <u>Simon Purdon</u>.</p>
        <a className="text-blue-400 hover:underline" href="/#">Go back</a>
      </div>
    </Page>
  );
}
