import React from 'react';
import { Header } from '../components/header.jsx';
import Container from '@mui/material/Container';
import Button from '@mui/material/Button';

function link_button(text) {
  return (
    <button
      className="
  bg-violet-950 
  text-gray-50
   "
    >
      {text}
    </button>
  );
}

export function Landing() {
  return (
    <div>
      <Header />
      <div>
        <Container maxWidth="lg" className="shadow-2xl p-12 m-4 bg-purple-950">
          <p className="text-center text-7xl font-extrabold text-gray-50">welcome to droppr.</p>
        </Container>
      </div>

      <div className="flex align-middle item-center justify-center mt-16">
        <div>
          <Container maxWidth="xs" className="shadow-2xl">
            <ul>
              <li>
                <p className="text-xl align-middle font-bold my-4 text-violet-950">
                  A new way to transfer files.
                </p>
              </li>
              <li>
                <p>
                  droppr allows you to easily and quickyl transfer files between devices, for free.
                  aa aaaa aaaaa aaa aa a
                </p>
              </li>
            </ul>
          </Container>
        </div>

        <div>
          <ul className="flex flex-col items-center justify-center">
            <li className="align-middle pl-8">
              <Button variant="contained" color="secondary">
                drop
              </Button>
            </li>
            <li className="align-middle pl-8 my-4">
              <Button variant="contained" color="secondary" className="align-middle">
                receive
              </Button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
