import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@backend": path.resolve(__dirname, "../backend/src"),
      "@contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@chart-kit": path.resolve(__dirname, "../../packages/chart-kit/src"),
    },
  },
});
