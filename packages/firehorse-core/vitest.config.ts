import { defineConfig } from "vitest/config";

// Explicit include so this package's run cannot inherit a config from an
// ancestor directory. Without it, vitest walks up to the repo root, adopts the
// root project's `include`, matches nothing here, and exits 0 with 75 tests
// unrun while the gate still reports green.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
