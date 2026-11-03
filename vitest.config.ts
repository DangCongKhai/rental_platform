import path from "node:path";
import { loadEnv } from "vite";
import { defineConfig } from "vitest/config";

export default defineConfig(({ mode }) => ({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  test: {
    // Vitest does not read .env by itself. Load it before test files are imported.
    env: loadEnv(mode, import.meta.dirname, ""),
    projects: [
      {
        extends: true,
        test: {
          name: "server",
          environment: "node",
          testTimeout: 60_000,
          hookTimeout: 60_000,
          include: [
            "src/server/**/*.test.ts",
            "src/lib/**/*.test.ts",
            "src/app/**/*.test.ts",
          ],
        },
      },
      {
        extends: true,
        test: {
          name: "components",
          environment: "jsdom",
          include: ["src/components/**/*.test.tsx"],
        },
      },
      {
        extends: true,
        test: {
          name: "domain",
          environment: "node",
          include: ["src/domain/**/*.test.ts"],
        },
      },
    ],
  },
}));
