import { StateCreator } from "zustand";
import type { ReceiverSlice, StateStore } from "@/interfaces/store";
import { DropperHandlers, FileReceiver } from "@/interfaces/types";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

// Throttle for how often we report progress to the UI. Can be adjusted or removed later if we want to make it more or less frequent.
const PROGRESS_STEP = 256 * 1024;

const initialState = {
  file: {
    name: "",
    size: 0,
    type: "",
    href: "",
  },
  bytesReceived: 0,
  processingProgress: 0,
  _turnServers: [],
  error: null,
  _receiverHandlers: null,
};

export const createReceiverSlice: StateCreator<
  StateStore,
  [],
  [],
  ReceiverSlice
> = (set, get) => ({
  ...initialState,
  openReceiver: (
    file: FileReceiver,
    turnServers: RTCIceServer[],
    receiverHandlers: DropperHandlers,
  ) => {
    set({
      file: file,
      _turnServers: turnServers,
      _receiverHandlers: receiverHandlers,
    });
    get()._fileSystemAccessLoop();
  },
  _fileSystemAccessLoop: async () => {
    try {
      // Rough equivalent to window.showOpenFilePicker() in the web client. We can improve this later if we need to.
      const isAvailable = await Sharing.isAvailableAsync();

      if (!isAvailable) {
        throw new Error("Sharing is not available on this device");
      }

      const fileMetadata = get().file;

      const file = new File(Paths.cache, fileMetadata.name);

      if (file.exists) file.delete();
      file.create();

      const writeStream = file.writableStream().getWriter();

      get().createPeer(false, get()._turnServers, {
        onConnected: () => get()._receiverHandlers?.onConnected(),
        onDisconnected: () => get()._receiverHandlers?.disconnected(),
        onError: (error: Error) => {
          const peerError = new Error("peer error", { cause: error });
          set({ error: peerError });
          get()._receiverHandlers?.onError(peerError);
        },
      });

      let bytesReceived = 0;
      let lastReported = 0;

      set({ bytesReceived: 0 });

      // Receives the file from webRTC in chunks, writes it to the file system, and reports progress to the UI.
      while (bytesReceived < fileMetadata.size) {
        const chunk = await get().receiveFromRTC();
        const bytes = new Uint8Array(await chunk.arrayBuffer());

        await writeStream.write(bytes);
        bytesReceived += bytes.byteLength;

        if (bytesReceived - lastReported >= PROGRESS_STEP) {
          set({ bytesReceived });
          lastReported = bytesReceived;
        }
      }

      if (bytesReceived !== fileMetadata.size) {
        throw new Error(
          `Size mismatch: expected ${fileMetadata.size}, got ${bytesReceived}`,
        );
      }

      await writeStream.close();
      set({ bytesReceived });

      await Sharing.shareAsync(file.uri, {
        mimeType: fileMetadata.type || "application/octet-stream",
        dialogTitle: "Share file",
        UTI: fileMetadata.type,
      });
    } catch (err) {
      get()._onReceiverError(err as Error);
    }
  },
  _onReceiverError: (err: Error) => {
    get().closePeer();
    set({ error: err });
    get()._receiverHandlers?.onError(err);
  },
});
