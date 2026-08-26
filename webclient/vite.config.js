import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    proxy: {
      "/api": "http://localhost:5050",
      "/sc": { target: "ws://localhost:5050", ws: true },
    },
  },
  preview: {
    proxy: { "/api": "http://localhost:5050" },
  },
});
