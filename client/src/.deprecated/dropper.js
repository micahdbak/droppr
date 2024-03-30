// DEPRECATED
//
// Copyright (C) 2024 droppr. All rights reserved.
//
// interface/
// dropper.js

import { sleep, wsRoot, _blobSize, _maxBufferedAmount, _rtcConfiguration, _setBytes, _setStatus } from './helpers.js';

let rtc = null; // WebRTC connection
let sc = null; // Signal Channel WebSocket connection
let dc = null; // the data channel

let isSendingFile = false;

// drop all blobs for a file
async function dropFile(file) {
  isSendingFile = true;

  try {
    let start = 0;

    while (start < file.size) {
      // check if the buffered amount exceeds an arbitrary max
      if (rtc.connectionState !== 'connected') {
        do {
          sleep(100); // 100ms
        } while (rtc.connectionState !== 'connected');
      } else if (dc.bufferedAmount > _maxBufferedAmount) {
        // wait for it to be flushed halfway
        do {
          _setBytes(start - dc.bufferedAmount);
          await sleep(5); // 5ms
        } while (dc.bufferedAmount > 0);
      }

      // calculate the end of the next slice
      const end = start + _blobSize > file.size ? file.size : start + _blobSize;

      // make blob and reader for writing to WebSocket
      let blob = file.slice(start, end);
      let reader = blob.stream().getReader();

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        // send the Uint8Array as binary data through the Data Channel
        dc.send(value);
      }

      // explicitly free these
      reader = null;
      blob = null;

      start += _blobSize;
      _setBytes(start - dc.bufferedAmount);
    }
  } catch (err) {
    console.log('Caught an error in dropFile:');
    console.log(err);

    return;
  }

  _setBytes(file.size);

  // no more data to send
  dc.send('{"type":"complete"}');

  isSendingFile = false;
}

export function drop(file, update) {
  if (rtc !== null || sc !== null || dc !== null) {
    return; // no two workers at the same time, please
  }

  // WebRTC setup

  rtc = new RTCPeerConnection(_rtcConfiguration); // prepare the browser for RTC

  rtc.addEventListener('connectionstatechange', (event) => {
    console.log('WebRTC connection state change:');
    console.log(rtc.connectionState);

    update({
      status: rtc.connectionState,
    });

    // close
    if (rtc.connectionState === 'closed') {
      rtc = null;
    }
  });

  rtc.addEventListener('iceconnectionstatechange', async (event) => {
    console.log('WebRTC ICE connection state change:');
    console.log(rtc.iceConnectionState);

    update({
      status: rtc.iceConnectionState,
    });

    if (rtc.iceConnectionState === 'failed') {
      const offer = await rtc.createOffer({ iceRestart: true });
      rtc.setLocalDescription(offer);

      const packet = {
        type: 'offer',
        offer,
      };

      sc.send(JSON.stringify(packet));
    }
  });

  rtc.addEventListener('icecandidate', (event) => {
    if (event.candidate !== null) {
      console.log('Got ICE candidate:');
      console.log(event.candidate);

      const packet = {
        type: 'candidate',
        candidate: event.candidate,
      };

      sc.send(JSON.stringify(packet));
    }
  });

  // Data Channel setup

  dc = rtc.createDataChannel('droppr'); // data channel for sending files

  dc.addEventListener('open', () => {
    console.log('DC opened!');

    const packet = {
      type: 'inform',
      fileInfo: {
        name: file.name,
        size: file.size,
        type: file.type
      }
    };

    dc.send(JSON.stringify(packet));

    // drop the file
    dropFile(file);
  });

  dc.addEventListener('message', (event) => {
    if (typeof event.data === 'string') {
      const message = JSON.parse(event.data);

      console.log(message);

      if (message.type === 'received') {
        try {
          dc.close(); // if it hasn't been, yet
          dc = null;

          rtc.close(); // if it hasn't been, yet
          rtc = null;

          sc.close(); // if it hasn't been, yet
          sc = null;
        } catch (err) {
          // pass
        }

        update({
          status: 'complete'
        });
      }
    }
  });

  // Signal Channel setup

  sc = new WebSocket(wsRoot + '/drop'); // route for creating a new drop

  sc.addEventListener('close', () => {
    sc = null; // set the WebSocket connection to null
  });

  // on every message received from the server
  sc.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data); // parse JSON

    // the drop was successfully registered
    if (message.status === 'registered') {
      console.log(message);
      update(message); // status, id given as attributes
    }

    if (message.status === 'waiting') {
      console.log('still waiting');
    }

    // the recipient has connected to the server, and is waiting for our WebRTC offer
    if (message.status === 'ready') {
      // create WebRTC offer
      const offer = await rtc.createOffer();
      rtc.setLocalDescription(offer);

      const packet = {
        type: 'offer',
        offer,
      };

      sc.send(JSON.stringify(packet));
    }

    if (message.type === 'answer') {
      console.log('Got answer:');
      console.log(message.answer);

      rtc.setRemoteDescription(message.answer);
    }

    if (message.type === 'candidate') {
      console.log('Got candidate:');
      console.log(message.candidate);

      rtc.addIceCandidate(message.candidate);
    }

    _setStatus(message.status);
  });
}
