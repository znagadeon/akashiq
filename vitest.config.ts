import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["packages/*/src/**/*.spec.ts", "examples/*/src/**/*.test.ts", "scripts/**/*.spec.ts"],
  },
});
