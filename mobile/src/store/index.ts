import { create } from "zustand";
import type { StateStore } from "@/interfaces/store";
import { createPeerSlice } from "./slices/peerSlice";
import { createSignalChannelSlice } from "./slices/signalChannelSlice";
import { createDropperSlice } from "./slices/dropperSlice";
export const useStore = create<StateStore>()((set, get, api) => ({
  ...createSignalChannelSlice(set, get, api),
  ...createPeerSlice(set, get, api),
  ...createDropperSlice(set, get, api),
  // Resolve once the store reaches a state that satisfies `predicate` using
  // Zustand's subscribe method. Replaces the one-shot
  // addEventListener/removeEventListener pattern from the web client. Defined on
  // the global store so any slice can use it.
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
