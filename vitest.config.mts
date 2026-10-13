import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // load .env (including DATABASE_URL) for the integration tests
    env: loadEnv("test", process.cwd(), ""),
    testTimeout: 20_000,
    // integration tests share one database
    fileParallelism: false,
  },
});
