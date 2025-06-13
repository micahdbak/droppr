// About.jsx

import React from 'react';

import { AppWindow } from './components';

export function About() {
  return (
    <AppWindow>
      <div className="flex flex-col items-center">
        <img src="/box.png" className="w-52 rounded-xl mb-4"></img>
        <p className="mb-4">Brought to you by <u>Nakul Bansal</u>, <u>Micah Baker</u>, <u>Johnny Deng</u>, and <u>Simon Purdon</u>.</p>
        <a className="text-lg bg-gray-700 hover:bg-gray-500 text-white px-4 py-2 rounded-xl mb-1" href="/#">
          Go Back
        </a>
      </div>
    </AppWindow>
  );
}
