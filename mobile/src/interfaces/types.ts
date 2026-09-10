export type WebSocketMessage = MessageEvent & { data: string };
export type SignalChannelMessage = MessageEvent & { data: object };
export type DataChannelMessage = MessageEvent & { data: ArrayBuffer | string };
export type FileReceiver = {
  name: string;
  size: number;
  type: string;
  href: string;
};

// Packets exchanged over the signal channel as part of the WebRTC handshake.
export type SignalPacket =
  | { type: "offer"; offer: RTCSessionDescriptionInit }
  | { type: "answer"; answer: RTCSessionDescriptionInit }
  | { type: "candidate"; candidate: RTCIceCandidateInit | null };

// Handler types define a series of functions that should be called on specific events (replacing multiple addEventListener() calls)
export type SignalChannelHandlers = {
  onConnected: () => unknown;
  onDisconnected: () => unknown;
  onMessage: (message: any) => unknown;
  onError: (error: Error) => unknown;
};

export type PeerHandlers = {
  onConnected: () => unknown;
  onError: (error: Error) => unknown;
  onDisconnected: () => unknown;
  onOk?: () => unknown;
  onBlob?: () => unknown;
};

export type DropperHandlers = {
  onConnected: (bytesSent?: number) => unknown;
  disconnected: () => unknown;
  onError: (error: Error) => unknown;
  onDone: () => unknown;
};
