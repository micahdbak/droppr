import type { StateCreator } from "zustand";
import type { signalChannelSlice } from "@/interfaces/store";
import type {
  SignalChannelHandlers,
  WebSocketMessage,
} from "@/interfaces/types";
const PING_RATE = 1000; // 1s

const SC_PROTOCOL = "wss";
const SC_URL = `${SC_PROTOCOL}://${process.env.HOST_URL}/sc`;

export const createSignalChannelSlice: StateCreator<signalChannelSlice> = (
  set,
  get,
) => ({
  _webSocket: null,
  _persist: false,
  _pingInterval: null,
  error: null,
  status: "closed",
  _handlers: null,
  open: (handlers: SignalChannelHandlers | null) => {
    // Return if there's already an active websocket connection
    if (get()._webSocket !== null) return;

    set({ _handlers: handlers, error: null, status: "connecting" });

    get()._connect();
  },
  _connect: () => {
    const webSocket = new WebSocket(SC_URL);

    webSocket.addEventListener("open", () => get()._onWebSocketOpen());
    webSocket.addEventListener("close", () => get()._onWebSocketClose());
    webSocket.addEventListener("message", (event) =>
      get()._onWebSocketMessage(event as WebSocketMessage),
    );

    set({ _webSocket: webSocket });
  },
  // Send a 'ping' to the other side
  _ping: () => {
    try {
      const webSocket = get()._webSocket;

      if (webSocket === null) {
        get()._stopPinging();
        return;
      }

      webSocket.send('"ping"');
    } catch (err) {
      get()._onWebSocketfail(<Error>err);
    }
  },
  _startPinging: () => {
    if (get()._pingInterval !== null) return;
    set({ _pingInterval: setInterval(() => get()._ping(), PING_RATE) });
  },
  _stopPinging: () => {
    const interval = get()._pingInterval;
    if (interval === null) return false;

    clearInterval(interval);
    set({ _pingInterval: null });
    return true;
  },

  // When a websocket is opened, it sends a ping every second to the other side until it receives a 'pong'
  _onWebSocketOpen: () => {
    try {
      get()._startPinging();
      set({ _persist: true }); // connected once; reconnect on failure
    } catch (err) {
      get()._onWebSocketfail(<Error>err);
    }
  },
  _onWebSocketClose: () => {
    try {
      set({ _webSocket: null }); // free resources

      if (get()._pingInterval !== null) {
        get()._stopPinging();
      }

      if (get()._persist) {
        // attempt to reconnect to the signal channel
        get()._connect();
      }
      set({ status: get()._persist ? "connecting" : "closed" });
      get()._handlers?.onDisconnected?.();
    } catch (err) {
      get()._onWebSocketfail(<Error>err);
    }
  },
  _onWebSocketMessage: (event: WebSocketMessage) => {
    try {
      const message = JSON.parse(event.data);

      // received a string
      if (typeof message === "string") {
        if (message === "ping" || message === "pong") {
          // stop pinging; other side has connected
          if (get()._stopPinging()) {
            set({ status: "connected" });
            get()._handlers?.onConnected?.();
          }

          if (message === "ping") {
            get()._webSocket?.send('"pong"'); // send pong
          }
        } else {
          throw new Error("bad message: " + message);
        }

        // received an object
      } else if (message !== null && typeof message === "object") {
        switch (message.status) {
          // dropper or recipient is already connected for this drop
          case "busy":
            throw new Error("busy");

          // the signal channel has failed to send a message to the other end
          case "failed":
            if (get()._pingInterval === null) {
              // dispatch disconnected event
              get()._handlers?.onDisconnected();

              // start pinging again
              get()._startPinging();
            }

            break;

          // the signal channel has passed along a message from the peer
          default:
            // dispatch message event
            get()._handlers?.onMessage(message);

            break;
        }
      } else {
        throw new Error("received unexpected message: " + message);
      }
    } catch (err) {
      get()._onWebSocketfail(<Error>err);
    }
  },
  _onWebSocketfail: (err: Error) => {
    get().close();
    set({ error: err });
    get()._handlers?.onError?.(err);
  },
  send: (data: string) => {
    // don't send the message when not connected
    if (get()._webSocket === null || get()._pingInterval !== null) {
      throw new Error("Not connected.");
    }

    get()._webSocket?.send(data);
  },
  close: () => {
    // don't persist and attempt to reconnect after closing the WebSocket
    set({ _persist: false });

    // stop pinging the WebSocket
    get()._stopPinging();

    // close the WebSocket connection
    get()._webSocket?.close();
    set({ _webSocket: null, status: "closed" });
  },
});
