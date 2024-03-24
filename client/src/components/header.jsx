import React from 'react';

export function Header() {
  return (
    <div>
      <nav className="bg-neutral-50 border-neutral-200">
        <div className="flex flex-nowrap items-center justify-between py-3 px-4">
          <div className="flex items-center justify-between ml-12">
            <p
              className="text-3xl text-slate-700 font-bold hover:cursor-pointer"
              onClick={() => { location.href = '/' }}
            >
              droppr.
            </p>
          </div>
          <div className="flex items-center justify-between font-medium">
            <button
              className="mr-8 font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 hover:cursor-pointer px-4 py-3 transition ease-in-out hover:scale-110"
              onClick={() => { location.href = '/?view=about' }}
            >
              About
            </button>
            <button
              className="mr-12 font-medium rounded-md bg-neutral-100 hover:bg-neutral-200 hover:cursor-pointer px-4 py-3 transition ease-in-out hover:scale-110"
              onClick={() => { location.href = '/?view=drop' }}
            >
              Drop
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}
