import { describe, expect, it } from "vitest";

import { parseDiscovered } from "./discovery-io.js";

const GOOD = {
  query: "named techniques in agentic coding, last 30 days",
  ranAt: "2026-09-20",
  items: [
    { kind: "topic", name: "Loop engineering", summary: "Treating the agent loop itself as the unit of design.", signal: "trending on HN" },
    { kind: "repo", name: "gepa-ai/gepa", url: "https://github.com/gepa-ai/gepa", summary: "Prompt optimiser." },
  ],
};

describe("parsing a discovery file", () => {
  it("returns one candidate per item", () => {
    expect(parseDiscovered(GOOD).length).toBe(2);
  });

  it("keeps the summary and the signal, which the report shows", () => {
    const [topic] = parseDiscovered(GOOD);
    expect(topic?.summary).toContain("agent loop");
    expect(topic?.signal).toBe("trending on HN");
  });

  it("gives a discovered repo a repo id so it collides with the same repo when starred", () => {
    const [, repo] = parseDiscovered(GOOD);
    expect(repo?.id).toBe("repo:gepa-ai/gepa");
  });

  it("accepts a bare owner/name for a repo item with no url", () => {
    const parsed = parseDiscovered({ items: [{ kind: "repo", name: "a/b", summary: "s" }] });
    expect(parsed[0]?.url).toBe("https://github.com/a/b");
  });

  it("names the offending entry when kind is not one it knows", () => {
    expect(() =>
      parseDiscovered({ items: [{ kind: "podcast", name: "x", summary: "s" }] }),
    ).toThrow(/item 0.*podcast/is);
  });

  it("names the offending entry when a required field is missing", () => {
    expect(() => parseDiscovered({ items: [{ kind: "topic", summary: "s" }] })).toThrow(/item 0.*name/is);
  });

  it("rejects a repo item whose name is not owner\\/name", () => {
    expect(() =>
      parseDiscovered({ items: [{ kind: "repo", name: "not-a-slug", summary: "s" }] }),
    ).toThrow(/item 0.*owner\/name/is);
  });

  it("treats an absent items array as a malformed file, not an empty run", () => {
    // An empty discovery file and a broken one look identical downstream, and
    // silently judging nothing is the worse failure.
    expect(() => parseDiscovered({})).toThrow(/items/i);
  });

  it("drops a duplicate id inside one file, keeping the first", () => {
    const parsed = parseDiscovered({
      items: [
        { kind: "repo", name: "a/b", summary: "first" },
        { kind: "repo", name: "A/B", summary: "second" },
      ],
    });
    expect(parsed).toHaveLength(1);
    expect(parsed[0]?.summary).toBe("first");
  });
});
