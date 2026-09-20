import { describe, expect, it } from "vitest";

import { parseArgs } from "./args.js";

describe("flag values", () => {
  it("takes every value after one flag, which is what --mute <id>... documents", () => {
    const args = parseArgs(["--mute", "repo:a/b", "topic:loop-engineering"]);
    expect(args.mute).toEqual(["repo:a/b", "topic:loop-engineering"]);
  });

  it("still takes a repeated flag, which is what the workflow's step 6 writes", () => {
    const args = parseArgs(["--mute", "repo:a/b", "--mute", "topic:x"]);
    expect(args.mute).toEqual(["repo:a/b", "topic:x"]);
  });

  it("stops collecting at the next flag", () => {
    const args = parseArgs(["--mute", "repo:a/b", "--record"]);
    expect(args.mute).toEqual(["repo:a/b"]);
    expect(args.record).toBe(true);
  });
});

describe("discovery", () => {
  it("is off unless asked for", () => {
    expect(parseArgs([]).discovered).toBeNull();
  });

  it("uses the conventional path when --discovered carries no value", () => {
    expect(parseArgs(["--discovered"]).discovered).toMatch(/discovered\.json$/);
  });

  it("takes an explicit path over the conventional one", () => {
    expect(parseArgs(["--discovered", "/tmp/x.json"]).discovered).toBe("/tmp/x.json");
  });

  it("honours --skip-discovery, which the workflow advertises", () => {
    // The definition's argumentHint and step 1 both name this flag. It was
    // documented and never parsed, so it silently did nothing.
    expect(parseArgs(["--skip-discovery"]).discovered).toBeNull();
  });

  it("lets --skip-discovery win over --discovered rather than half-running", () => {
    expect(parseArgs(["--discovered", "--skip-discovery"]).discovered).toBeNull();
  });
});

describe("repos", () => {
  it("accepts owner/name and a pasted URL alike", () => {
    const args = parseArgs(["--repo", "a/b", "--repo", "https://github.com/c/d"]);
    expect(args.repos).toEqual(["a/b", "c/d"]);
  });

  it("strips a trailing .git and slash", () => {
    expect(parseArgs(["--repo", "https://github.com/c/d.git"]).repos).toEqual(["c/d"]);
  });
});
