import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const API_PORT = Number.parseInt(process.env["FIREHORSE_GRAPH_PORT"] ?? "5187", 10);

export default defineConfig({
  plugins: [react()],
  server: {
    // In dev the app still talks to /api on its own origin; Vite forwards to
    // the proxy server, so there is one API code path, not two.
    proxy: {
      "/api": { target: `http://localhost:${API_PORT}`, changeOrigin: true },
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
  },
});
