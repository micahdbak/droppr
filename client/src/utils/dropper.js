// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// dropper.js

import { Dropper } from '../models/index.js';

let _dropper = null;

let status = '';
let id = '';
const fileinfo = {};
const offset = {};

// NOTE: the eventCallback argument should be a function of the form:
//   eventCallback(name, data)
// Where eventName is any of the following:
export function drop(files) {
  if (_dropper !== null) {
    return; // only one dropper at a time
  }

  _dropper = new Dropper(files);

  status = 'started';
  fileinfo = dropper.fileinfo;

  _dropper.addEventListener('registered', (event) => {
    status = 'registered';
    id = event.data;
  });

  _dropper.addEventListener('connected', (event) => {
    status = 'connected';
  });

  _dropper.addEventListener('disconnected', (event) => {
    status = 'disconnected';
  });

  _dropper.addEventListener('offsetchanged', (event) => {
    offset[event.data.label] = event.data.offset;
  });

  _dropper.addEventListener('failed', () => {
    status = 'failed';
  });

  _dropper.addEventListener('done', () => {
    status = 'done';
  });
}

// getters

export function getStatus() {
  return status;
}

export function getId() {
  return id;
}

export function getFileinfo() {
  return fileinfo;
}

export function getOffset() {
  return offset;
}
