import React from 'react';

export function Header() {
  return (
    <div>
      <nav className="bg-neutral-100 shadow-sm">
        <div className="flex flex-wrap items-center justify-between p-4">
          <div className="flex items-center justify-between ml-24">
            <p className="text-3xl text-slate-950 font-bold">droppr.</p>
          </div>
          <div className="flex items-center justify-between font-medium">
            <p className="mr-16 font-medium">Receive</p>
            <p className="mr-24 font-medium">Drop</p>
          </div>
        </div>
      </nav>
    </div>
  );
}
