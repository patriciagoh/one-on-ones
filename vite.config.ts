/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages subpath; HashRouter handles in-app routing. vite preview serves under this base.
  base: "/one-on-ones/",
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
