import React from 'react';
import { Header } from '../components/header.jsx';
import Container from '@mui/material/Container';
import Fab from '@mui/material/Fab';

export function About() {
  return (
    <body className="min-h-screen bg-gradient-to-b from-violet-900 to-gray-300">
      <div>
        <Header />
        <div>
          <Container maxWidth="lg" className="shadow-2xl p-12 m-4 bg-purple-950">
            <p className="text-center text-7xl font-extrabold text-gray-50">droppr.</p>
          </Container>
        </div>

        <div className="flex align-middle item-center justify-center mt-16">
          <div>
            <Container maxWidth="xs" className="shadow-2xl bg-white">
              <ul>
                <li>
                  <p className="text-xl align-middle font-bold text-violet-950">Simply transfer.</p>
                </li>
                <li>
                  <p>
                    Droppr allows you to easily and quickly transfer files between devices, for
                    free.
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
                  onClick={() => { location.href = '/?view=drop'}}
                >
                  Drop
                </Fab>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </body>
  );
}
