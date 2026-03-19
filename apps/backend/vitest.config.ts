import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "../../packages/contracts/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@backend": path.resolve(__dirname, "./src"),
      "@contracts": path.resolve(__dirname, "../../packages/contracts/src"),
    },
  },
});
