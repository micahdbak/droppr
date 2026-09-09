import type {
  WebSocketMessage,
  SignalChannelHandlers,
  DataChannelMessage,
  PeerHandlers,
  SignalPacket,
  DropperHandlers,
} from "./types";

export interface SignalChannelSlice {
  status: "closed" | "connecting" | "connected" | "disconnected";
  _webSocket: WebSocket | null; // the WebSocket connection to the signal channel server
  _persist: boolean; // whether to persist and attempt to reconnect
  _pingInterval: number | null; // the interval for ping messages
  error: Error | null;
  _signalChannelSliceHandlers: SignalChannelHandlers | null;

  open: (handlers: SignalChannelHandlers | null) => void;
  _connect: () => void;
  _ping: () => void;
  _startPinging: () => void;
  _stopPinging: () => void | boolean;
  _onWebSocketOpen: () => void;
  _onWebSocketClose: () => void;
  _onWebSocketMessage: (event: WebSocketMessage) => void;
  _onWebSocketfail: (err: Error) => void;
  sendToSignalChannel: (data: string) => void;
  closeSignalChannel: () => void;
}

export interface SharedSlice {
  // Resolve once the store reaches a state that satisfies `predicate` using
  // Zustand's subscribe method. Replaces the one-shot
  // addEventListener/removeEventListener pattern from the web client. Lives on
  // the global store so any slice can use it.
  _waitForState: (predicate: (state: StateStore) => boolean) => Promise<void>;
}

export interface PeerSlice {
  _isDropper: boolean; // whether this instance is the dropper
  _peerConnection: RTCPeerConnection | null; // the WebRTC peer connection
  _iceRestart: boolean; // whether to restart the ICE gathering process
  _moreCandidates: boolean; // whether there are more ICE candidates
  _morePeerCandidates: boolean; // whether the peer has more ICE candidates
  _dataChannel: RTCDataChannel | null; // data channel through which data is transferred
  _turnError: { code: number; url: string } | null; // last ICE candidate error from a TURN server
  _failedAttempts: number;
  _isConnected: boolean; // whether or not the peer connection is live
  _state: number; // for send() and receive()
  _i: number; // index of current message in a batch
  _peerStateHandlers: PeerHandlers | null;
  // compiled blobs received from peer
  _blob: Blob;
  _count: number;
  error: Error | null;

  createPeer: (
    isDropper: boolean,
    iceServers: RTCIceServer[],
    handlers: PeerHandlers,
  ) => void;
  _openSignalChannel: () => void;
  _onSignalChannelError: (err: Error) => void;
  _onSignalChannelConnected: () => Promise<void>;
  _onSignalChannelDisconnected: () => void;
  _onSignalChannelMessage: (message: SignalPacket) => Promise<void>;
  _restart: () => void;
  _onNegotiationNeeded: () => void;
  _onIceConnectionStateChange: () => void;
  _onConnectionStateChange: () => void;
  _recover: () => void;
  _closeWithError: (cause: Error) => void;
  _onIceCandidate: (event: RTCPeerConnectionIceEvent) => void;
  _onDataChannel: (event: RTCDataChannelEvent | Event) => void;
  _onDataChannelMessage: (event: DataChannelMessage) => void;
  _onPeerError: (err: Error) => void;
  closePeer: () => void;
  drain: (timeout?: number) => Promise<void>;
  sendToRTC: (message: Blob) => Promise<void>;
  receiveFromRTC: () => Promise<Blob>;
  resetPeer: () => void;
}

export interface DropperSlice {
  bytesSent: number;
  error: Error | null;
  _dropperHandlers: DropperHandlers | null;

  startDropper: (file: File, turnServers: RTCIceServer[]) => void;
  _dropFile: (file: File, turnServers: RTCIceServer[]) => Promise<void>;
  _createPeer: (iceServers: RTCIceServer[]) => void;
  _resetDropper: () => void;
  _onDropperError: (err: Error) => void;
}

export type StateStore = SignalChannelSlice &
  PeerSlice &
  DropperSlice &
  SharedSlice;
