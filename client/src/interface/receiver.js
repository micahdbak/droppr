// interface/
// receive.js

let receiverWorker = null;

export function receive(id, update) {
  if (receiverWorker !== null) {
    return; // no two workers at the same time, please
  }

  receiverWorker = new Worker('/workers/receiver.js');
  receiverWorker.postMessage(id); // give the worker the drop identifier

  receiverWorker.addEventListener('error', (event) => {
    // log error
    console.log('Error; Receiver Worker:');
    console.log(JSON.stringify(event));

    update({
      status: 'error',
      data: event,
    });
  });

  receiverWorker.addEventListener('message', (event) => {
    // log error
    console.log('Message; Receiver Worker:');
    console.log(event.data);

    update({
      status: 'message',
      data: event.data,
    });

    // process messages from the worker
  });
}
