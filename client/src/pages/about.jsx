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
        <img src={box_img} className='w-52'></img>
      </div>


{/* 
      <div className="flex align-middle item-center justify-center mt-16">
        <div>
          <Container maxWidth="xs" className="shadow-2xl bg-white">
            <ul>
              <li>
                <p className="text-xl align-middle font-bold text-violet-950">Simply transfer.</p>
              </li>
              <li>
                <p>
                  Droppr allows you to easily and quickly transfer files between devices, for free.
                </p>
              </li>
            </ul>
          </Container>
        </div>

        <div>
          <ul className="flex flex-col items-center justify-center">
            <li className="align-middle pl-8">
              <Fab
                variant="extended"
                color="secondary"
                className="hover:scale-110 transition ease-in-out"
                size="xl"
                onClick={() => {
                  location.href = '/?view=drop';
                }}
              >
                Drop
              </Fab>
            </li>
          </ul>
        </div>
      </div> */}
    </div>
  );
}
