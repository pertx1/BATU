import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
      "server-only": path.resolve(import.meta.dirname, "tests/stubs/empty.ts"),
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    // Las de seguridad necesitan un servidor en marcha: npm run test:security
    exclude: ["tests/security/**", "node_modules/**"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 20000,
  },
});
