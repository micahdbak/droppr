// Copyright (C) 2024 droppr. All rights reserved.
//
// utils/
// receive.js

import { Peer } from '../models/index.js';

let peer = null;
let dc = null;
let connected = false;
let pingInterval = null;

export function cancelReceive() {
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
export function receive(id, eventCallback) {
  if (peer !== null) {
    console.log('Error: A peer connection already exists.');
    return;
  } else {
    console.log('Running receive');
  }

  // open peer connection as dropper
  peer = new Peer(id);

  pingInterval = setInterval(() => {
    if (connected && dc !== null && dc.readyState === 'open') {
      dc.send('ping');
      eventCallback('pinged');
    } else {
      eventCallback('waiting');
    }
  }, 1000); // 1s

  peer.addEventListener('failed', () => {
    eventCallback('failed');
    cancelReceive();
  });

  peer.addEventListener('connected', () => {
    eventCallback('connected');
    connected = true;
  });

  peer.addEventListener('disconnected', () => {
    eventCallback('disconnected');
    connected = false;
  });

  peer.addEventListener('datachannel', (event) => {
    dc = event.channel;
    dc.addEventListener('message', (event) => {
      console.log(`message: ${event.data}`);
    });
  });
}
