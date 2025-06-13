// AppWindow.jsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';

export function AppWindow(props) {
  const { children } = props;

  const [numDrops, setNumDrops] = useState(0);

  useEffect(() => {
    const fn = async () => {
      try {
        const res = await axios.get("/api/status");
        if (res.status == 200) {
          setNumDrops(res.data.drops);
        }
      } catch (err) {
        // pass
      }
    }
    fn();
  }, []);

  return (
    <div className="fixed top-0 left-0 w-screen h-screen bg-white flex flex-col justify-between items-center">
      <div className="flex flex-col justify-center items-center p-6 gap-1">
        <a href="#about"><img className="h-10" src="title.png" /></a>
      </div>
      <div className="flex flex-col gap-2 justify-center align-center">
        <div className="relative w-96 h-96 border-4 border-gray-200 bg-white rounded-xl p-6 flex flex-col justify-center items-center mb-8">
          <div className="flex flex-col items-start">
            {children}
          </div>
        </div>
      </div>
      <p className="text-rg text-gray-500 mb-8">
        {numDrops} drops served 龴ↀ◡ↀ龴
      </p>
    </div>
  );
}
