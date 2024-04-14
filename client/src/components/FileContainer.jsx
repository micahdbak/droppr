// Copyright (C) 2024 droppr. All Rights Reserved.
//

import React, { useState } from 'react';

export function FileContainer(props) {
  const { children } = props;

  return (
    <div
      className={
        'overflow-scroll w-3/4 h-1/2 p-8 ' +
        'flex flex-row flex-wrap items-center justify-center gap-2 ' + 
        'bg-slate-100 border-slate-200 rounded-xl'
      }
    >
      {children}
    </div>
  );
} 
