// workers/
// receiver.js

onmessage = (event) => {
  console.log('Receiver: got a message');
  console.log(event.data);
};
