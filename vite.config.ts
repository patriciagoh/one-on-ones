/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Configurable for different hosts: GitHub Pages serves /one-on-ones/ (default),
  // a root-domain host (Vercel) sets VITE_BASE=/, self-hosters set their own path.
  base: process.env.VITE_BASE || "/one-on-ones/",
  plugins: [react()],
  test: {
    globals: true,
    // Default to node for domain (pure-function) tests; UI test files that
    // need a DOM annotate themselves with @vitest-environment happy-dom.
    // Note: jsdom 29 + html-encoding-sniffer 6 + @exodus/bytes (ESM-only)
    // causes ERR_REQUIRE_ESM on this Node version; happy-dom avoids the issue.
    environment: "node",
    setupFiles: ["./src/test/setup.ts"],
    environmentOptions: {},
  },
});
