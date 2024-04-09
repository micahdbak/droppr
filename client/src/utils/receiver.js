// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// receiver.js

import { Recipient } from '../models/index.js';

let _recipient = null;

let status = '';
const fileinfo = {};
const offset = {};
const download = {};

// NOTE: the eventCallback argument should be a function of the form:
//   eventCallback(name, data)
// Where eventName is any of the following:
export function receive(id) {
  if (_recipient !== null) {
    return; // only one recipient at a time
  }

  _recipient = new Recipient(id);

  status = 'started';

  _recipient.addEventListener('connected', (event) => {
    status = 'connected';
  });

  _recipient.addEventListener('disconnected', (event) => {
    status = 'disconnected';
  });

  _recipient.addEventListener('fileinfo', (event) => {
    fileinfo[event.data.label] = {
      name: event.data.name,
      size: event.data.size,
      type: event.data.type
    };
  });

  _recipient.addEventListener('offsetchanged', (event) => {
    offset[event.data.label] = event.data.offset;
  });

  _recipient.addEventListener('download', (event) => {
    download[event.data.label] = {
      name: event.data.name,
      size: event.data.size,
      type: event.data.type,
      href: event.data.href
    };
  });
}

// getters

export function getStatus() {
  return status;
}

export function getFileinfo() {
  return fileinfo;
}

export function getOffset() {
  return offset;
}

export function getDownload() {
  return download;
}
