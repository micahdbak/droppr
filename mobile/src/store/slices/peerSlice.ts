import type { StateCreator } from "zustand";
import type {
  DataChannelMessage,
  PeerHandlers,
  SignalPacket,
} from "@/interfaces/types";
import type { PeerSlice, StateStore } from "@/interfaces/store";

// 3478 is eturnal's default port
const STUN_SERVERS = [
  {
    urls: `stun:${process.env.HOSTNAME}:3478`,
  },
];

const FAILED_ATTEMPT_LIMIT = 3;

const BATCH_SIZE = 32;

// for _state
const STATE_READY = 0; // ready to receive messages
const STATE_WAITING = 1; // waiting for acknowledgement from peer

const initialState = {
  _isDropper: false,
  _peerConnection: null,
  _iceRestart: false,
  _moreCandidates: true,
  _morePeerCandidates: true,
  _dataChannel: null,
  _turnError: null,
  _failedAttempts: 0,
  _isConnected: false,
  _state: STATE_READY,
  _i: 0,
  _peerStateHandlers: null,
  _blob: new Blob([], { type: "application/octet-stream" }),
  _count: 0,
  error: null,
};

export const createPeerSlice: StateCreator<StateStore, [], [], PeerSlice> = (
  set,
  get,
) => ({
  ...initialState,

  createPeer: (
    isDropper: boolean,
    iceServers: RTCIceServer[],
    handlers: PeerHandlers,
  ) => {
    // Reset any existing data from a previous peer connection
    get().resetPeer();
    set({ _isDropper: isDropper, _peerStateHandlers: handlers });

    // init peer connection
    const peerConnection: RTCPeerConnection = new RTCPeerConnection({
      iceServers: [...STUN_SERVERS, ...iceServers],
    });
    peerConnection.addEventListener("negotiationneeded", () =>
      get()._onNegotiationNeeded(),
    );
    peerConnection.addEventListener("iceconnectionstatechange", () =>
      get()._onIceConnectionStateChange(),
    );
    peerConnection.addEventListener("connectionstatechange", () =>
      get()._onConnectionStateChange(),
    );
    peerConnection.addEventListener(
      "icecandidate",
      (event: RTCPeerConnectionIceEvent) => get()._onIceCandidate(event),
    );
    peerConnection.addEventListener(
      "icecandidateerror",
      (event: RTCPeerConnectionIceErrorEvent) => {
        console.error("ICE candidate error:", event);

        // a credential rejection is fatal
        if (
          typeof event.url === "string" &&
          event.url.startsWith("turn:") &&
          event.errorCode === 401
        ) {
          set({ _turnError: { code: event.errorCode, url: event.url } });
        }
      },
    );

    set({ _peerConnection: peerConnection });
    // if dropper, this end should create the data channel
    if (isDropper) {
      const dataChannel = peerConnection.createDataChannel("filestream");
      dataChannel?.addEventListener(
        "open",
        (event: RTCDataChannelEvent | Event) => get()._onDataChannel(event),
      );
      set({ _dataChannel: dataChannel });
    } else {
      peerConnection.addEventListener(
        "datachannel",
        (event: RTCDataChannelEvent | Event) => get()._onDataChannel(event),
      );
    }
    get()._openSignalChannel();
  },
  // Register events on the signal channel store
  _openSignalChannel: () => {
    get().open({
      onConnected: () => get()._onSignalChannelConnected(),
      onDisconnected: () => get()._onSignalChannelDisconnected(),
      onMessage: (message) => get()._onSignalChannelMessage(message),
      onError: (error: Error) => get()._onSignalChannelError(error),
    });
  },
  _onSignalChannelError: (err: Error) => {
    // signal channel failure is a fatal error
    get().closePeer(); // don't attempt to reconnect
    const error = new Error("signal channel error", { cause: err });
    set({ error: error });
    get()._peerStateHandlers?.onError(error);
  },
  _onSignalChannelConnected: async () => {
    try {
      // if dropper, send an RTC peer connection offer
      if (get()._isDropper) {
        const offer = await get()._peerConnection?.createOffer({
          iceRestart: get()._iceRestart,
        });
        await get()._peerConnection?.setLocalDescription(offer);

        // send the offer to the recipient
        const packet = { type: "offer", offer };
        get().sendToSignalChannel(JSON.stringify(packet));
      }
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onSignalChannelDisconnected: () => set({ _iceRestart: true }),
  // Handle incoming messages from the other end of the signal channel as part of the WebRTC handshake. If the peer is a receiver,
  // it can expect to receive an offer, else if the peer is a dropper, it can expect an answer. ICE candidates are sent to both ends
  _onSignalChannelMessage: async (message: SignalPacket) => {
    try {
      switch (message.type) {
        // Handle RTC connection offer
        case "offer": {
          if (get()._isDropper) {
            throw new Error("receiver sent peer connection offer");
          }

          const peerConnection = get()._peerConnection;
          if (!peerConnection) throw new Error("no peer connection");

          await peerConnection.setRemoteDescription(message.offer);

          const answer = await peerConnection.createAnswer();
          await peerConnection.setLocalDescription(answer);

          get().sendToSignalChannel(JSON.stringify({ type: "answer", answer }));

          break;
        }

        // Handle RTC connection answer
        case "answer": {
          if (!get()._isDropper) {
            throw new Error("dropper sent peer connection answer");
          }

          const peerConnection = get()._peerConnection;
          if (!peerConnection) throw new Error("no peer connection");

          await peerConnection.setRemoteDescription(message.answer);

          break;
        }

        // Handle ICE candidate
        case "candidate": {
          if (message.candidate === null) {
            set({ _morePeerCandidates: false });

            if (!get()._moreCandidates) {
              get().closeSignalChannel();
            }
          } else {
            await get()._peerConnection?.addIceCandidate(message.candidate);
          }

          break;
        }

        default:
          throw new Error("got unexpected message: " + JSON.stringify(message));
      }
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _restart: () => {
    const signalChannelStatus = get().status;
    if (
      signalChannelStatus === "closed" ||
      signalChannelStatus === "disconnected"
    ) {
      get()._openSignalChannel();
    }

    if (!get()._isDropper) {
      set({ _dataChannel: null });
    }

    set({ _moreCandidates: true, _morePeerCandidates: true });
  },
  _onNegotiationNeeded: () => {
    try {
      get()._restart();
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onIceConnectionStateChange: () => {
    try {
      const peerConnection = get()._peerConnection;
      if (peerConnection === null) return;

      console.log(`ICE connection state: ${peerConnection.iceConnectionState}`);
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onConnectionStateChange: () => {
    try {
      const peerConnection = get()._peerConnection;

      if (!peerConnection) return;

      console.log(`Connection state change: ${peerConnection.connectionState}`);

      const state = peerConnection.connectionState;

      if (state === "connected") {
        const dataChannel = get()._dataChannel;
        if (!get()._isConnected && dataChannel?.readyState === "open") {
          set({ _isConnected: true });
          get()._peerStateHandlers?.onConnected();
        }
      } else if (state === "disconnected" || state === "failed") {
        get()._recover();
      }
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  // Attempts to recover from a dropped connection, or close with a fatal error if retrying is hopeless
  _recover: () => {
    set({ _isConnected: false });

    // a TURN server rejecting our credentials never recovers by retrying
    const turnError = get()._turnError;
    if (turnError) {
      const { code, url } = turnError;
      get()._closeWithError(
        new Error(`TURN server rejected credentials (${code}) for ${url}`),
      );
      return;
    }

    set({ _failedAttempts: get()._failedAttempts + 1 });

    if (get()._failedAttempts >= FAILED_ATTEMPT_LIMIT) {
      get()._closeWithError(new Error("ICE connection failed"));
      return;
    }

    get()._restart();
    get()._peerStateHandlers?.onDisconnected();
  },
  _closeWithError: (cause: Error) => {
    get().closePeer();
    const error = new Error("connection failed", { cause });
    set({ error: error });
    get()._peerStateHandlers?.onError(error);
  },
  _onIceCandidate: (event: RTCPeerConnectionIceEvent) => {
    try {
      const packet = { type: "candidate", candidate: event.candidate };
      get().sendToSignalChannel(JSON.stringify(packet));

      // check for end-of-candidates signal
      if (event.candidate === null) {
        set({ _moreCandidates: false });

        // close signal channel if the peer has no more candidates
        if (!get()._morePeerCandidates) {
          get().closeSignalChannel();
        }
      }
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onDataChannel: (event: RTCDataChannelEvent | Event) => {
    try {
      const dataChannel =
        "channel" in event ? event.channel : get()._dataChannel;

      if (!dataChannel) return;

      dataChannel.binaryType = "blob"; // receive messages as `Blob`s
      dataChannel.addEventListener("message", (message: DataChannelMessage) =>
        get()._onDataChannelMessage(message),
      );
      set({
        _state: STATE_READY,
        _isConnected: true,
        _failedAttempts: 0,
        _turnError: null,
      });
      get()._peerStateHandlers?.onConnected();
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onDataChannelMessage: (event: DataChannelMessage) => {
    try {
      const data = event.data;

      if (data instanceof Blob) {
        set({ _count: get()._count + data.size });

        if (get()._isDropper) {
          throw new Error("got Blob as dropper");
        } else {
          // append it to _blob for the next call to receiveFromRTC
          const blob = new Blob([get()._blob, data], {
            type: "application/octet-stream",
          });
          set({ _blob: blob, _i: get()._i + 1 });

          if (get()._i > BATCH_SIZE) {
            throw new Error("dropper sent more messages in batch than allowed");
          }

          get()._peerStateHandlers?.onBlob?.();
        }
      } else if (typeof data === "string") {
        // data is a text message; check if it is an acknowledgement
        if (
          data === "ok" &&
          get()._state === STATE_WAITING &&
          get()._isDropper
        ) {
          set({ _state: STATE_READY, _i: 0 });
          get()._peerStateHandlers?.onOk?.();
        } else {
          throw new Error("got unexpected text message: " + data);
        }
      } else {
        throw new Error("got unexpected message: " + JSON.stringify(data));
      }
    } catch (err) {
      get()._onPeerError(err as Error);
    }
  },
  _onPeerError: (err: Error) => {
    get().closePeer();
    set({ error: err });
    get()._peerStateHandlers?.onError(err);
  },
  closePeer: () => {
    // close the signal channel
    get().closeSignalChannel();

    // close the WebRTC connection
    get()._peerConnection?.close();
    set({ _peerConnection: null, _dataChannel: null });
  },
  drain: async (timeout: number = 5000) => {
    const deadline = Date.now() + timeout;
    const dataChannel = get()._dataChannel;

    if (!dataChannel) return;

    while (dataChannel.bufferedAmount > 0 && Date.now() < deadline) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  },
  sendToRTC: async (message: Blob) => {
    // wait for the RTC connection to be completed if the peer isn't connected yet
    if (!get()._isConnected) {
      await get()._waitForState((state) => state._isConnected);
    }

    // Wait for an acknowledgement if mid-batch
    if (get()._state === STATE_WAITING) {
      await get()._waitForState((state) => state._state === STATE_READY);
      // NOTE: _state === STATE_READY && _i === 0
    }

    const dataChannel = get()._dataChannel;
    if (dataChannel === null) {
      throw new Error("data channel is not open");
    }

    // send it through the data channel
    dataChannel.send(message);
    set({ _i: get()._i + 1 }); // advance the index in the batch

    // after `BATCH_SIZE` messages, wait for an acknowledgement before sending more
    if (get()._i === BATCH_SIZE) {
      set({ _state: STATE_WAITING });
    }
  },
  receiveFromRTC: async () => {
    // wait for the RTC connection to be completed if the peer isn't connected yet
    if (!get()._isConnected) {
      await get()._waitForState((state) => state._isConnected);
    }

    // wait for at least one blob to arrive from the peer
    if (get()._blob.size === 0) {
      await get()._waitForState((state) => state._blob.size > 0);
    }

    // take the accumulated blob and reset the buffer for the next call
    const blob = get()._blob;
    set({ _blob: new Blob([], { type: "application/octet-stream" }) });

    if (get()._i >= BATCH_SIZE) {
      set({ _i: 0 }); // ready to receive the next batch

      // NOTE: the connection could close between receiving the blob and this
      // point, leaving _dataChannel null.
      const dataChannel = get()._dataChannel;
      if (dataChannel === null) {
        throw new Error(
          "data channel closed before batch could be acknowledged",
        );
      }

      dataChannel.send("ok"); // acknowledge the batch
    }

    return blob;
  },
  resetPeer: () => {
    get().closePeer();
    set(initialState);
  },
});
