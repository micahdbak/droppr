// interface/
// receive.js

import { wsRoot, _setBytes, _setStatus, _rtcConfiguration, _setName, _setSize, _setType } from './helpers.js';

let rtc = null; // WebRTC connection
let sc = null; // Signal Channel WebSocket connection
let dc = null; // the data channel

let blob = new Blob();
let fileInfo = {};

let _update = () => {};

function onMessage(event) {
  if (typeof event.data === 'string') {
    const message = JSON.parse(event.data);

    if (message.type === 'inform') {
      // retrieve file info
      fileInfo = message.fileInfo;

      _setName(fileInfo.name);
      _setSize(fileInfo.size);
      _setType(fileInfo.type);
    } else if (message.type === 'complete') {
      // create downloadable URL for the object
      const href = URL.createObjectURL(new Blob([blob], { type: fileInfo.type }));
      blob = null; // garbage

      dc.send('{"type":"received"}');
      dc.close();
      dc = null;

      _update({
        status: 'complete',
        download: {
          href,
          ...fileInfo // name, size, type
        }
      });

      rtc.close();
      rtc = null;
    } else {
      // pass
    }
  } else {
    // continue building the blob
    blob = new Blob([blob, event.data]);
    _setBytes(blob.size);
  }
}

export function receive(id, update) {
  if (rtc !== null || sc !== null) {
    return; // no two workers at the same time, please
  }

  _update = update;

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

  rtc.addEventListener('icecandidate', (event) => {
    console.log('Got ICE candidate:');
    console.log(event.candidate);

    const packet = {
      type: 'candidate',
      candidate: event.candidate,
    };

    sc.send(JSON.stringify(packet));
  });

  rtc.addEventListener('datachannel', (event) => {
    console.log('DC negotiated');

    dc = event.channel; // RTCDataChannel

    dc.addEventListener('open', () => {
      console.log('DC opened!');
    });

    dc.addEventListener('message', onMessage);

    sc.close();
    sc = null;
  });

  // Signal Channel setup

  sc = new WebSocket(wsRoot + `/receive/${id}`);

  sc.addEventListener('close', () => {
    sc = null; // set the WebSocket connection to null
  });

  sc.addEventListener('message', async (event) => {
    const message = JSON.parse(event.data);

    if (message.type === 'test') {
      console.log('Got a test message.');
    }

    if (message.type === 'offer') {
      console.log('Got offer:');
      console.log(message.offer);

      rtc.setRemoteDescription(message.offer);

      // create WebRTC answer
      const answer = await rtc.createAnswer();
      rtc.setLocalDescription(answer);

      const packet = {
        type: 'answer',
        answer,
      };

      sc.send(JSON.stringify(packet));
    }

    if (message.type === 'candidate') {
      console.log('Got candidate:');
      console.log(message.candidate);

      rtc.addIceCandidate(message.candidate);
    }
  });
}
