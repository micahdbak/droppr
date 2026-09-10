import { create } from "zustand";
import type { StateStore } from "@/interfaces/store";
import { createPeerSlice } from "./slices/peerSlice";
import { createSignalChannelSlice } from "./slices/signalChannelSlice";
import { createDropperSlice } from "./slices/dropperSlice";
import { createReceiverSlice } from "./slices/receiverSlice";

export const useStore = create<StateStore>()((set, get, api) => ({
  ...createSignalChannelSlice(set, get, api),
  ...createPeerSlice(set, get, api),
  ...createDropperSlice(set, get, api),
  ...createReceiverSlice(set, get, api),
  _waitForState: (predicate: (state: StateStore) => boolean) =>
    new Promise<void>((resolve) => {
      if (predicate(get())) {
        resolve();
        return;
      }

      const unsubscribe = api.subscribe((state) => {
        if (predicate(state)) {
          unsubscribe();
          resolve();
        }
      });
    }),
}));
