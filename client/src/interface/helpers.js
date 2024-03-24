// interface/
// helpers.js

// constants

const wsRoot = 'ws://207.23.190.191:5050';

// states

let bytes = 0;
let size = 0;
let speed = 0;
let name = '';
let status = '';

function getBytes() {
  return bytes;
}

function getSize() {
  return size;
}

function getSpeed() {
  return speed;
}

function getName() {
  return name;
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

function _setSpeed(newSpeed) {
  speed = newSpeed;
}

function _setName(newName) {
  name = newName;
}

function _setStatus(newStatus) {
  status = newStatus;
}

export {
  getBytes,
  getSize,
  getSpeed,
  getName,
  getStatus,
  wsRoot,
  _setBytes,
  _setSize,
  _setSpeed,
  _setName,
  _setStatus,
};
