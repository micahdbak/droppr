export type WebSocketMessage = MessageEvent & { data: string };

// Defines a series of functions that should be called on specific signal channel events (replacing multiple addEventListener() calls)
export type SignalChannelHandlers = {
  onConnected: () => unknown;
  onDisconnected: () => unknown;
  onMessage: (message: WebSocketMessage) => unknown;
  onError: (error: Error) => unknown;
};
