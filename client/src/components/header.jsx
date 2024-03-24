import React from 'react';

export function Header() {
  return (
    <div>
      <nav className="bg-gray-400">
        <div className="flex flex-wrap items-center justify-between p-4">
          <div className="flex items-center justify-between ml-4">
            <p>droppr.</p>
          </div>
          <div className="flex items-center justify-between font-medium">
            <p>Drop</p>
            <p>Receive</p>
          </div>
        </div>
      </nav>
    </div>
  );
}
