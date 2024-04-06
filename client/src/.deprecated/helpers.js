// DEPRECATED
//
// Copyright (C) 2024 droppr. All rights reserved.
//
// interface/
// helpers.js

// constants

const wsRoot = process.env.REACT_APP_WS_ROOT;
const _blobSize = 256 * 1024; // 256 kB
const _maxBufferedAmount = 1000 * 1024; // 1 MB
const _rtcConfiguration = {
  iceServers: [
    {
      urls: 'stun:relay.droppr.net:5051'
    },
    {
      urls: 'turn:relay.droppr.net:5051',
      username: 'droppr',
      credential: 'p2pfiletransfer'
    }
  ]
};

// states

let bytes = 0;
let size = 0;
let name = '';
let type = '';
let status = '';

function getBytes() {
  return bytes;
}

function getSize() {
  return size;
}

function getName() {
  return name;
}

function getType() {
  return type;
}

function getStatus() {
  return status;
}

function _setBytes(newBytes) {
  bytes = newBytes;
}

function _setSize(newSize) {
  size = newSize;
}

function _setName(newName) {
  name = newName;
}

function _setType(newType) {
  type = newType;
}

function _setStatus(newStatus) {
  status = newStatus;
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

export {
  getBytes,
  getSize,
  getName,
  getType,
  getStatus,
  sleep,
  wsRoot,
  _blobSize,
  _maxBufferedAmount,
  _rtcConfiguration,
  _setBytes,
  _setSize,
  _setName,
  _setType,
  _setStatus
};
