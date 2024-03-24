# Droppr.

Simply transfer.

## CAVEATS

Droppr is very early in development.
Be careful with using browsers other than Google Chrome or Safari, especially with files of large size (>1GB).
If you want to be safe, run it in a VM.
This can be a memory zipbomb.
But, it's cool!

## Preamble

### Part A

For too long have we transferred files over Google Drive, iCloud, Discord, and dealt with loss of image quality, latency, slow download speeds, and limited storage options.
Not to mention that you must pay for extra access to these services.

We live in an age of the modern internet with high bandwidth and so much address space.
So why are we so dependant on these cloud services?
Why must we forfeit our data to the hands of corporate conglomerations and pesky government bodies!

Bring your data home!!!

Simply transfer!!!

Use Droppr!!!

### Part B

Droppr is built by leveraging WebRTC to facilitate peer-to-peer (p2p) file transfer.
This is fundamentally different to the file transfer methods commonly in use today, where a server stores a file intermittently until it is downloaded by the recipient.

One outlier is AirDrop, however, AirDrop operates solely on Bluetooth.
Thus, AirDrop is limited to the physical space surrounding the device, not to mention the ecosystem it is locked into, namely, Apple's.
This hinders the true potential of device-to-device file transfer.

We have an internet, why don't we use it?

## WebRTC

WebRTC (Web Real Time Communication) is a JavaScript API designed to facilitate the real-time and peer-to-peer connectivity between two browsers, leveraging a server as a middleman to connect these peers, after which, pure peer-to-peer communication is engaged.

WebRTC is typically used for video and audio conferencing, ranging from applications such as Zoom to Discord, however, few seem to take advantage of the Data Channels that WebRTC's spec provides.
This is what Droppr takes advantage of, where no one else does.

## Signal Channel

WebRTC requires that a signal channel server is created to connect the two peers and pass identifying information between the two.
We created a signal channel using Go, that connects with two interested peers over WebSockets.

The server provides a 'drop identifier' that the peers share in common, and that is considered their session.
WebSockets are used to pass credentials for WebRTC back and forth between the peers, until they understand enough about their internet topology such that they can begin communicating in a purely peer-to-peer fashion.

## Data Channels

Once the peer-to-peer connection is established, a data channel is opened where one peer (the dropper) can stream arbitrary data to the other peer (the recipient).
This data channel is completely separate to files, so that must be handled separately.

## Blobs

JavaScript provides the Blob framework for chunking a File into consumable binary parts.
Droppr uses Blobs to convert an input file into chunks, namely, 256 kB chunks, that are then passed through the data channel to be received by the recipient.
The recipient, as they receive these chunks, reconstructs the file by collecting these blobs in sequential order.

Once the transfer is complete, the recipient fully assembles the File, and initiates a download.
At this point, the drop is finished.
