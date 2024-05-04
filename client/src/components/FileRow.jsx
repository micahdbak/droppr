// Copyright (C) 2024 droppr. All Rights Reserved.
//

import React, { useState } from 'react';

export function FileRow(props) {
  const { name, size, href, disabled } = props;

  const startDownload = () => {
    const a = document.createElement('a');

    a.href = href;
    a.download = name;
    a.target = '_blank';

    document.body.appendChild(a);
    a.click(); // trigger the download
    document.body.removeChild(a);
  };

  // thumbnail for this file
  const thumbnail = <img className="inline" src="/file.png" />;

  // display in kilobytes (for now)
  const sizeText = `${+(size / 1024).toFixed(1)} kB`;

  return href ? (
    <tr className="download" onClick={startDownload}>
      <td className="text-blue-700">
        {thumbnail} {name}
      </td>
      <td className="font-light text-slate-600">{sizeText}</td>
    </tr>
  ) : (
    <tr className={disabled ? 'disabled' : ''}>
      <td className={disabled ? 'text-slate-500' : 'text-slate-800'}>
        {thumbnail} {name}
      </td>
      <td className={disabled ? 'text-slate-400' : 'text-slate-600'}>
        {sizeText}
      </td>
    </tr>
  );
}
