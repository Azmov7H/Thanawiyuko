import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["tests/**", "**/*.d.ts", "**/*.config.*", "**/mocks/**"],
    },
  },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});