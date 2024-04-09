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
  recipient.addEventListener('connected', (event) => {
    eventCallback('connected');
  });
  recipient.addEventListener('disconnected', (event) => {
    eventCallback('disconnected');
  });
  recipient.addEventListener('fileinfo', (event) => {
    eventCallback('fileinfo', event.data);
  });
  recipient.addEventListener('offsetchanged', (event) => {
    eventCallback('offsetchanged', event.data);
  });
  recipient.addEventListener('download', (event) => {
    eventCallback('download', event.data);
  });
}
