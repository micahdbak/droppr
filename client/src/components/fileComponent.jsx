import React from 'react';

export function FileComponent({ fileInfo, index }) {
    const { name, size } = fileInfo;
  return ( //add file view using mimetypes
    <div>
      <p>({index}) {name} ({size} KB)</p>
    </div>
  );
}

