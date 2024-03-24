// interface/
// dropper.js

import { wsRoot, _setStatus } from './helpers.js';

let rtc = null; // WebRTC connection
let scWs = null; // Signal Channel WebSocket connection
let dc = null; // the data channel

export function drop(file, update) {
  if (rtc !== null || scWs !== null) {
    return; // no two workers at the same time, please
  }

  rtc = new RTCPeerConnection(); // prepare the browser for RTC

  rtc.addEventListener('connectionstatechange', (event) => {
    console.log('Connection State Change');
    console.log(event);
  });

  dc = rtc.createDataChannel('Droppr Data Channel');

  dc.addEventListener('open', () => {
    console.log('DC opened!');
  });

  scWs = new WebSocket(wsRoot + '/drop'); // route for creating a new drop

  rtc.addEventListener('icecandidate', (event) => {
    if (event.candidate !== null) {
      console.log('Got ICE candidate:');
      console.log(event.candidate);

      const packet = {
        type: 'candidate',
        candidate: event.candidate,
      };

      scWs.send(JSON.stringify(packet));
    }
  });

  console.log(rtc.connectionState);

  // ping the socket every second
  let checkIfReady = setInterval(() => {
    // don't send a message through an unopened WebSocket
    if (!scWs || scWs.readyState !== 1) {
      return;
    }

    // send a test message
    scWs.send('{"type":"test"}');
  }, 1000);

  scWs.addEventListener('close', () => {
    scWs = null; // set the WebSocket connection to null
  });

  // on every message received from the server
  scWs.addEventListener('message', async (event) => {
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
      // stop sending test messages
      clearInterval(checkIfReady);

      // create WebRTC offer
      const offer = await rtc.createOffer();
      rtc.setLocalDescription(offer);

      const packet = {
        type: 'offer',
        offer,
      };

      scWs.send(JSON.stringify(packet));
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
