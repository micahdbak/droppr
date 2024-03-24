// interface/
// helpers.js

// constants

const wsRoot = 'ws://207.23.190.191:5050';
const _blobSize = 256 * 1024; // 256 kB
const _maxBufferedAmount = 1000 * 1024; // 1 MB
const _rtcConfiguration = {
  iceServers: [
    {
      urls: "stun:stun.relay.metered.ca:80",
    },
    {
      urls: "turn:na.relay.metered.ca:80",
      username: "0c4d926a7674eb75577d4574",
      credential: "flfI0hMapaN2uEk8",
    },
    {
      urls: "turn:na.relay.metered.ca:80?transport=tcp",
      username: "0c4d926a7674eb75577d4574",
      credential: "flfI0hMapaN2uEk8",
    },
    {
      urls: "turn:na.relay.metered.ca:443",
      username: "0c4d926a7674eb75577d4574",
      credential: "flfI0hMapaN2uEk8",
    },
    {
      urls: "turns:na.relay.metered.ca:443?transport=tcp",
      username: "0c4d926a7674eb75577d4574",
      credential: "flfI0hMapaN2uEk8",
    },
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
  _setStatus,
};
