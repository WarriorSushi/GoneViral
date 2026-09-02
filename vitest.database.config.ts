import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(projectRoot, "src"),
    },
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["tests/integration/**/*.test.ts"],
    setupFiles: ["tests/integration/setup-environment.ts"],
    sequence: {
      concurrent: false,
    },
    testTimeout: 20_000,
  },
});
