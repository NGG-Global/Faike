import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const path = (relative: string) => fileURLToPath(new URL(relative, import.meta.url));

// Unit tests for framework-free logic and Route Handlers (Node environment, no DOM).
export default defineConfig({
  resolve: {
    alias: [
      { find: "@", replacement: path("./src") },
      // Tests run as server code: resolve the marker to its server entry.
      { find: /^server-only$/, replacement: path("./node_modules/server-only/empty.js") },
    ],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
