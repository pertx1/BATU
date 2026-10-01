import { defineConfig } from "vitest/config";
import path from "node:path";

// Pruebas de aislamiento contra un servidor en marcha (npm run test:security).
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, ".") } },
  test: {
    include: ["tests/security/**/*.test.ts"],
    environment: "node",
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 120000,
  },
});
