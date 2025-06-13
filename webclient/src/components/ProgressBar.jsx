// ProgressBar.jsx

import React, { useEffect, useRef, useState } from 'react';

export function ProgressBar(props) {
  const { percentage } = props;

  return (
    <div className="w-full h-4 bg-gray-400 rounded border border-gray-500 relative">
      <div
        className="absolute left-0 top-0 bottom-0 rounded bg-gray-200"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
