import React, { useEffect, useState } from 'react';

import { AppWindow } from './components';

export function SpinningWheel() {
  const [degree, setDegree] = useState(0);

  useEffect(() => {
    const degreeInterval = setInterval(() => {
      setDegree((_degree) => {
        if (_degree + 5 > 360) {
          return 0;
        }

        return _degree + 5;
      });
    }, 10);

    return () => {
      clearInterval(degreeInterval);
    };
  }, []);

  return (
    <AppWindow>
      <div className="flex flex-col gap-2 justify-center align-center">
        <img
          style={{
            transform: `rotate(${degree}deg)`,
            opacity: '0.75'
          }}
          src="/spinner.svg"
          width="32"
          height="32"
        />
      </div>
    </AppWindow>
  );
}
