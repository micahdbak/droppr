import React from 'react';
import { Header } from '../components/header.jsx';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';
import box_img from "../assests/box.png"

export function About() {
  return (
    <div>
      <Header />

      <div className="py-4 px-4 bg-purple-950 flex justify-center items-center flex-col">
        <p className="text-center text-6xl font-extrabold text-gray-50 mt-2">droppr.</p>
        <p className='text-white font-semibold mt-4 mb-2 italic'>Simply Transfer.</p>
      </div>

      <div className='flex items-center justify-center m-8'>
        <img src={box_img} className='w-52 rounded-xl '></img>
      </div>

      <div className='flex items-center justify-center m-12'>
        <p></p>
      </div>

    </div>
  );
}
