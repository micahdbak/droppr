// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// drop.js

import { DataChannel, Peer } from '../models/index.js';

let peer = null;
let dc = null;
let pingInterval = null;

export function cancelDrop() {
  // stop pinging
  if (pingInterval !== null) {
    clearInterval(pingInterval);
    pingInterval = null;
  }

  // close data channel
  if (dc !== null) {
    dc.close();
    dc = null;
  }

  // close peer connection
  if (peer !== null) {
    peer.close();
    peer = null;
  }
}

// NOTE: the eventCallback argument should be a function of the form:
//   eventCallback(name, data)
// Where eventName is any of the following:
export function drop(file, eventCallback) {
  if (peer !== null) {
    console.log('Error: A peer connection already exists.');
    return;
  } else {
    console.log('Running drop');
  }

  // open peer connection as dropper
  peer = new Peer();
  dc = new DataChannel(peer, 'file');

  dc.addEventListener('message', (event) => {
    console.log(event.data);
  });

  dc.addEventListener('open', () => {
    if (pingInterval === null) {
      pingInterval = setInterval(() => {
        dc.send('ping'); // send ping
        eventCallback('pinged');
      }, 1000); // 1s
    }
  });

  dc.addEventListener('close', () => {
    if (pingInterval !== null) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  });

  peer.addEventListener('registered', (event) => {
    eventCallback('registered', event.data);
  });

  peer.addEventListener('failed', () => {
    eventCallback('failed');
    cancelDrop();
  });

  peer.addEventListener('connected', () => {
    eventCallback('connected');
  });

  peer.addEventListener('disconnected', () => {
    eventCallback('disconnected');

    if (pingInterval !== null) {
      clearInterval(pingInterval);
      pingInterval = null;
    }
  });
}
