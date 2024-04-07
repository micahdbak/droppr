// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// receive.js

import { Recipient } from '../models/index.js';

let recipient = null;

// NOTE: the eventCallback argument should be a function of the form:
//   eventCallback(name, data)
// Where eventName is any of the following:
export function receive(id, eventCallback) {
  if (recipient !== null) {
    return; // only one recipient at a time
  }

  recipient = new Recipient(id);

  // add event listeners (triggers eventCallback)
  recipient.addEventListener('open', () => {
    eventCallback('open');
  });
  recipient.addEventListener('fileinfo', (event) => {
    eventCallback('fileinfo', event.data);
  });
  recipient.addEventListener('close', () => {
    eventCallback('close');
  });
  recipient.addEventListener('bytes', (event) => {
    eventCallback('bytes', event.data);
  });
  recipient.addEventListener('download', (event) => {
    eventCallback('download', event.data);
  });
}
