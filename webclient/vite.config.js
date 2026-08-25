import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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
