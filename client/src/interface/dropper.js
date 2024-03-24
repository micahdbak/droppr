// interface/
// dropper.js

import { wsRoot, _setStatus } from './helpers.js';

let rtc = null; // WebRTC connection
let sc = null; // Signal Channel WebSocket connection
let dc = null; // the data channel

export function drop(file, update) {
  if (rtc !== null || sc !== null || dc !== null) {
    return; // no two workers at the same time, please
  }

  // WebRTC setup

  rtc = new RTCPeerConnection(); // prepare the browser for RTC

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
