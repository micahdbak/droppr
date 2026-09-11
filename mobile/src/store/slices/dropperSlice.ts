import { DropperSlice, StateStore } from "@/interfaces/store";
import type { StateCreator } from "zustand";

const MESSAGE_SIZE = 16384;

const initialState = {
  bytesSent: 0,
  error: null,
  _dropperHandlers: null,
};

export const createDropperSlice: StateCreator<
  StateStore,
  [],
  [],
  DropperSlice
> = (set, get) => ({
  ...initialState,

  startDropper: (file: File, turnServers: RTCIceServer[]) => {
    get()._resetDropper();
    get()._dropFile(file, turnServers);
  },
  _dropFile: async (file: File, turnServers: RTCIceServer[]) => {
    try {
      get().createPeer(true, turnServers, {
        onConnected: () => get()._dropperHandlers?.onConnected(get().bytesSent),
        onDisconnected: () => get()._dropperHandlers?.disconnected(),
        onError: (error: Error) => {
          const peerError = new Error("peer error", { cause: error });
          set({ error: peerError });
          get()._dropperHandlers?.onError(peerError);
        },
      });

      let bytesSent = get().bytesSent;

      while (bytesSent < file.size) {
        const end = Math.min(bytesSent + MESSAGE_SIZE, file.size);
        const blob = file.slice(bytesSent, end);

        await get().sendToRTC(blob);
        bytesSent = end;
        set({ bytesSent: end });
      }

      await get().drain();
      get().closePeer();
      get()._dropperHandlers?.onDone();
    } catch (err) {
      get()._onDropperError(err as Error);
    }
  },
  _resetDropper: () => {
    get().resetPeer();
    set(initialState);
  },
  _onDropperError: (err: Error) => {
    get().closePeer();
    set({ error: err });
    get()._dropperHandlers?.onError(err);
  },
});
