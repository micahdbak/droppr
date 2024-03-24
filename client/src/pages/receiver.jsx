import React, { useEffect } from 'react';

import * as droppr from '../interface';

export function Receiver(props) {
  const { id } = props; // the drop id

  // on page load
  useEffect(() => {
    droppr.receive(id, (update) => {
      console.log(update);
    });
  }, []);

  return (
    <div>
      <p1 className="text-3xl">Reciever Page</p1>
    </div>
  );
}
