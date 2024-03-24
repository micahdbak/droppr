import React from 'react';
import { Route, Routes } from 'react-router-dom';

import {Landing, Receiver, Sender} from './pages/index.jsx';

export function Main() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/receiver" element={<Receiver />} />
      <Route path="/sender" element={<Sender />} />
    </Routes>
  );
}
