// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// drop.js

import { Dropper } from '../models/index.js';

let dropper = null;

// NOTE: the eventCallback argument should be a function of the form:
//   eventCallback(name, data)
// Where eventName is any of the following:
export function drop(files, eventCallback) {
  if (dropper !== null) {
    return; // only one dropper at a time
  }

  dropper = new Dropper(files);

  eventCallback('fileinfo', dropper.fileinfo);

  // add event listeners (triggers eventCallback)
  dropper.addEventListener('registered', (event) => {
    eventCallback('registered', event.data);
  });
  dropper.addEventListener('connected', (event) => {
    eventCallback('connected');
  });
  dropper.addEventListener('disconnected', (event) => {
    eventCallback('disconnected');
  });
  dropper.addEventListener('offsetchanged', (event) => {
    eventCallback('offsetchanged', event.data);
  });
  dropper.addEventListener('failed', () => {
    eventCallback('failed');
  });
  dropper.addEventListener('done', () => {
    eventCallback('done');
  });
}
