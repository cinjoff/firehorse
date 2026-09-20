import { describe, expect, it } from "vitest";

import { migrateLedger, mergeEntries, mutedIds, LEDGER_SCHEMA_VERSION } from "./ledger.js";

const V1 = {
  schemaVersion: 1,
  entries: [
    {
      repo: "gepa-ai/gepa",
      judgedAt: "2026-09-20",
      relevance: 0.63,
      value: 2.91,
      overlap: 0.17,
      disposition: "below-gate",
    },
  ],
};

describe("migration from v1", () => {
  it("carries every v1 entry across without losing one", () => {
    const migrated = migrateLedger(V1);
    expect(migrated.schemaVersion).toBe(LEDGER_SCHEMA_VERSION);
    expect(migrated.entries).toHaveLength(1);
  });

  it("derives the v2 id and kind from the v1 repo field", () => {
    const [entry] = migrateLedger(V1).entries;
    expect(entry?.id).toBe("repo:gepa-ai/gepa");
    expect(entry?.kind).toBe("repo");
    expect(entry?.name).toBe("gepa-ai/gepa");
  });

  it("preserves the judgment numbers and the disposition unchanged", () => {
    const [entry] = migrateLedger(V1).entries;
    expect(entry?.value).toBe(2.91);
    expect(entry?.disposition).toBe("below-gate");
  });

  it("leaves a v2 ledger alone", () => {
    const v2 = migrateLedger(V1);
    expect(migrateLedger(v2)).toEqual(v2);
  });

  it("treats a missing file as an empty v2 ledger rather than failing", () => {
    expect(migrateLedger(undefined).entries).toEqual([]);
    expect(migrateLedger(null).entries).toEqual([]);
  });

  it("refuses a schema newer than this script understands", () => {
    expect(() => migrateLedger({ schemaVersion: 99, entries: [] })).toThrow(/99/);
  });
});

describe("muting", () => {
  const ledger = migrateLedger({
    schemaVersion: 2,
    entries: [
      { id: "repo:a/b", kind: "repo", name: "a/b", judgedAt: "2026-09-20", relevance: 0.9, value: 3, overlap: 0.1, disposition: "muted" },
      { id: "topic:loop-engineering", kind: "topic", name: "Loop engineering", judgedAt: "2026-09-20", relevance: 0.9, value: 3, overlap: 0.1, disposition: "shortlisted" },
    ],
  });

  it("reports only the muted ids", () => {
    expect(mutedIds(ledger)).toEqual(new Set(["repo:a/b"]));
  });

  it("does not mute a shortlisted entry", () => {
    expect(mutedIds(ledger).has("topic:loop-engineering")).toBe(false);
  });
});

describe("merging a pass into the ledger", () => {
  const existing = migrateLedger({
    schemaVersion: 2,
    entries: [
      { id: "repo:a/b", kind: "repo", name: "a/b", judgedAt: "2026-09-01", relevance: 0.1, value: 1, overlap: 0.1, disposition: "below-gate" },
    ],
  });

  it("replaces an entry judged again rather than duplicating it", () => {
    const merged = mergeEntries(existing.entries, [
      { id: "repo:a/b", kind: "repo", name: "a/b", judgedAt: "2026-09-20", relevance: 0.9, value: 3, overlap: 0.1, disposition: "shortlisted" },
    ]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.disposition).toBe("shortlisted");
    expect(merged[0]?.judgedAt).toBe("2026-09-20");
  });

  it("keeps a mute even when a later pass judges the entry again", () => {
    // Muting is the user's decision and a re-judge is the script's. The script
    // does not get to overturn it, or a muted repo returns on the next scan.
    const muted = mergeEntries(existing.entries, [
      { id: "repo:a/b", kind: "repo", name: "a/b", judgedAt: "2026-09-20", relevance: 0.9, value: 3, overlap: 0.1, disposition: "muted" },
    ]);
    const rejudged = mergeEntries(muted, [
      { id: "repo:a/b", kind: "repo", name: "a/b", judgedAt: "2026-09-21", relevance: 0.9, value: 3, overlap: 0.1, disposition: "shortlisted" },
    ]);
    expect(rejudged[0]?.disposition).toBe("muted");
  });

  it("appends an id it has not seen and sorts deterministically", () => {
    const merged = mergeEntries(existing.entries, [
      { id: "repo:c/d", kind: "repo", name: "c/d", judgedAt: "2026-09-20", relevance: 0.9, value: 3, overlap: 0.1, disposition: "shortlisted" },
    ]);
    expect(merged.map((entry) => entry.id)).toEqual(["repo:a/b", "repo:c/d"]);
  });
});
