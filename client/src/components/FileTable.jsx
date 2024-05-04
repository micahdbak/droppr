// Copyright (C) 2024 droppr. All Rights Reserved.
//

import React, { useState } from 'react';

import '../stylesheets/FileTable.css';

export function FileTable(props) {
  const { children } = props;

  return (
    <div className="droppr-file-table-container">
      <table className="droppr-file-table">
        <tr>
          <th className="text-left font-normal text-sm text-slate-500 bg-slate-100">
            Name
          </th>
          <th className="text-left font-normal text-sm text-slate-500 bg-slate-100">
            Size
          </th>
        </tr>
        {children}
      </table>
    </div>
  );
}
