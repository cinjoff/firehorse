import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "definitions/index": "src/definitions/index.ts",
    "setup/index": "src/setup/index.ts",
    "upstreams/index": "src/upstreams/index.ts",
  },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node20",
  splitting: false,
  treeshake: true,
});
