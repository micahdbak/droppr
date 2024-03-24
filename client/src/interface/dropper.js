// interface/
// dropper.js

let dropperWorker = null;

export function drop(file, update) {
  if (dropperWorker !== null) {
    return; // no two workers at the same time, please
  }

  dropperWorker = new Worker('/workers/dropper.js');
  dropperWorker.postMessage(file); // give the worker the file

  dropperWorker.addEventListener('error', (event) => {
    // log the error
    console.log('Error; Dropper Worker:');
    console.log(JSON.stringify(event));

    update({
      status: 'error',
      data: event,
    });
  });

  dropperWorker.addEventListener('message', (event) => {
    // log the message sent by the worker
    console.log('Message; Dropper Worker:');
    console.log(event.data);

    update({
      status: 'message',
      data: event.data,
    });

    // process messages from the worker
  });
}
