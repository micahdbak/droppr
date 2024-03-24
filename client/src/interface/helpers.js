// interface/
// helpers.js

// constants

const wsRoot = 'localhost:5050';

// states

let bytes = 0;
let size = 0;
let speed = 0;
let name = '';

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

export { getBytes, getSize, getSpeed, getName, wsRoot, _setBytes, _setSize, _setSpeed, _setName };
