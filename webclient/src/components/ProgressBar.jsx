// ProgressBar.jsx

import React from 'react';

export function ProgressBar(props) {
  const { bytes, total } = props;

  return (
    <div className="bg-gray-400 w-72 h-4 relative rounded-md border-2 border-gray-400">
      <div
        className="bg-gray-200 absolute top-0 left-0 bottom-0 rounded"
        style={{ right: `${100 - Math.round(100 * bytes / total)}%` }}
      />
    </div>
  );
}
