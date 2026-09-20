import { defineConfig } from "vitest/config";

// Root project for the maintainer scripts under scripts/. scripts/ is not a
// package, so it was covered by neither `pnpm test` nor `pnpm typecheck`.
//
// `root` pins this project to the repo root. Each package carries its own
// vitest config, which stops a package run from walking up and inheriting the
// include below: that inheritance silently produced "No test files found,
// exiting with code 0" for firehorse-core.
export default defineConfig({
  root: __dirname,
  test: {
    include: ["scripts/**/*.test.ts"],
    environment: "node",
  },
});
