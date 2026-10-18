import { defineConfig } from "vitest/config";
import { resolve } from "node:path";
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "."),
      "server-only": resolve(__dirname, "tests/server-only.ts"),
    },
  },
  test: { testTimeout: 30000, hookTimeout: 60000, fileParallelism: false },
});
