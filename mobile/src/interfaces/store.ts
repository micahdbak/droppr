import type { WebSocketMessage, SignalChannelHandlers } from "./types";

export interface signalChannelSlice {
  status: "closed" | "connecting" | "connected" | "disconnected";
  _webSocket: WebSocket | null; // the WebSocket connection to the signal channel server
  _persist: boolean; // whether to persist and attempt to reconnect
  _pingInterval: number | null; // the interval for ping messages
  error: Error | null;
  _handlers: SignalChannelHandlers | null;

  open: (handlers: SignalChannelHandlers | null) => void;
  _connect: () => void;
  _ping: () => void;
  _startPinging: () => void;
  _stopPinging: () => void | boolean;
  _onWebSocketOpen: () => void;
  _onWebSocketClose: () => void;
  _onWebSocketMessage: (event: WebSocketMessage) => void;
  _onWebSocketfail: (err: Error) => void;
  send: (data: string) => void;
  close: () => void;
}
