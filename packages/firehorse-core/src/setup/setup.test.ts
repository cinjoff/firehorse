import { describe, expect, it } from "vitest";

import {
  FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION,
  FirehorseSetupManifestError,
  checkFirehorseSetup,
  computeFirehorseIndexStaleness,
  parseFirehorseSetupManifest,
  validateFirehorseSetupManifest,
} from "./index.js";

const RECORDED_COMMIT = "c4790d9a1f2b3c4d5e6f708192a3b4c5d6e7f809";
const HEAD_COMMIT = "0123456789abcdef0123456789abcdef01234567";

const manifest = JSON.stringify({
  schemaVersion: 2,
  setup: {
    mattPocockSkills: { version: "1.2.3", at: "2026-09-11T09:24:00.000Z" },
  },
  index: {
    commit: RECORDED_COMMIT,
    at: "2026-09-11T09:24:00.000Z",
    graph: true,
    supermemory: true,
  },
  anchors: {
    design: true,
    codebase: ["ARCHITECTURE.md", "STRUCTURE.md", "CONVENTIONS.md"],
  },
  upstreams: { checkedAt: "2026-09-11T09:24:00.000Z" },
});

describe("Firehorse setup manifest v2", () => {
  it("parses the recorded setup, index, anchors and upstreams state", () => {
    const parsed = parseFirehorseSetupManifest(manifest);

    expect(parsed).toEqual({
      schemaVersion: FIREHORSE_SETUP_MANIFEST_SCHEMA_VERSION,
      setup: { mattPocockSkills: { version: "1.2.3", at: "2026-09-11T09:24:00.000Z" } },
      index: {
        commit: RECORDED_COMMIT,
        at: "2026-09-11T09:24:00.000Z",
        graph: true,
        supermemory: true,
      },
      anchors: { design: true, codebase: ["ARCHITECTURE.md", "STRUCTURE.md", "CONVENTIONS.md"] },
      upstreams: { checkedAt: "2026-09-11T09:24:00.000Z" },
    });
  });

  it("accepts a manifest that carries schemaVersion alone", () => {
    expect(parseFirehorseSetupManifest(JSON.stringify({ schemaVersion: 2 }))).toEqual({
      schemaVersion: 2,
    });
  });

  it("rejects an unknown schemaVersion", () => {
    const future = JSON.stringify({ schemaVersion: 3 });

    expect(() => parseFirehorseSetupManifest(future)).toThrow(FirehorseSetupManifestError);

    const result = checkFirehorseSetup({ manifestContent: future });
    expect(result.healthy).toBe(false);
    expect(result.manifest).toBeUndefined();
    expect(result.diagnostics[0]?.field).toBe("schemaVersion");
  });

  it("rejects a malformed body without throwing out of checkFirehorseSetup", () => {
    expect(() => parseFirehorseSetupManifest("{ not json")).toThrow(FirehorseSetupManifestError);

    const result = checkFirehorseSetup({ manifestContent: "{ not json" });
    expect(result.enabled).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.diagnostics).toMatchObject([
      { code: "setup_manifest.json_parse", severity: "error" },
    ]);
  });

  it("reports a missing manifest when Firehorse markers are present", () => {
    const result = checkFirehorseSetup({ markerPaths: [".firehorse"] });

    expect(result.enabled).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.diagnostics).toMatchObject([
      {
        code: "setup_manifest.missing",
        severity: "warning",
        path: ".firehorse/manifest.json",
        message: "no .firehorse/manifest.json — run /new-project",
      },
    ]);
  });

  it("stays disabled and silent with neither manifest nor markers", () => {
    expect(checkFirehorseSetup({})).toEqual({
      enabled: false,
      healthy: true,
      markerPaths: [],
      diagnostics: [],
    });
  });

  it("reports that setup has not run when setup.mattPocockSkills is absent", () => {
    const parsed = parseFirehorseSetupManifest(
      JSON.stringify({ schemaVersion: 2, index: { commit: RECORDED_COMMIT, at: "now" } }),
    );

    expect(validateFirehorseSetupManifest(parsed, { headCommit: RECORDED_COMMIT })).toMatchObject([
      { code: "setup.not_run", message: "setup has not run — run /new-project" },
    ]);
  });

  it("reports an unindexed repo when index is absent", () => {
    const parsed = parseFirehorseSetupManifest(
      JSON.stringify({
        schemaVersion: 2,
        setup: { mattPocockSkills: { version: "1.2.3", at: "now" } },
      }),
    );

    expect(computeFirehorseIndexStaleness(undefined, { headCommit: HEAD_COMMIT })).toEqual({
      status: "no-index",
    });
    expect(validateFirehorseSetupManifest(parsed, { headCommit: HEAD_COMMIT })).toMatchObject([
      { code: "index.missing", message: "repo has not been indexed — run /index" },
    ]);
  });
});

describe("index staleness", () => {
  it("is current when the recorded commit equals HEAD", () => {
    expect(computeFirehorseIndexStaleness(RECORDED_COMMIT, { headCommit: RECORDED_COMMIT })).toEqual(
      { status: "current" },
    );

    const result = checkFirehorseSetup({
      manifestContent: manifest,
      git: { headCommit: RECORDED_COMMIT },
    });
    expect(result.healthy).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("is behind when the recorded commit is an ancestor of HEAD", () => {
    expect(
      computeFirehorseIndexStaleness(RECORDED_COMMIT, {
        headCommit: HEAD_COMMIT,
        recordedIsAncestorOfHead: true,
        commitsBehind: 37,
      }),
    ).toEqual({ status: "behind", commitsBehind: 37 });

    const result = checkFirehorseSetup({
      manifestContent: manifest,
      git: { headCommit: HEAD_COMMIT, recordedIsAncestorOfHead: true, commitsBehind: 37 },
    });
    expect(result.healthy).toBe(false);
    expect(result.diagnostics).toMatchObject([
      { code: "index.behind", message: "index is 37 commits behind HEAD — run /index" },
    ]);
  });

  it("is diverged when the recorded commit is not an ancestor of HEAD", () => {
    expect(
      computeFirehorseIndexStaleness(RECORDED_COMMIT, {
        headCommit: HEAD_COMMIT,
        recordedIsAncestorOfHead: false,
      }),
    ).toEqual({ status: "diverged" });

    const result = checkFirehorseSetup({
      manifestContent: manifest,
      git: { headCommit: HEAD_COMMIT, recordedIsAncestorOfHead: false },
    });
    expect(result.diagnostics).toMatchObject([
      {
        code: "index.diverged",
        message: "index was recorded on a different history line — run /index",
      },
    ]);
  });

  it("is unknown, and therefore silent, when git facts are unavailable", () => {
    expect(computeFirehorseIndexStaleness(RECORDED_COMMIT, {})).toEqual({ status: "unknown" });
    expect(checkFirehorseSetup({ manifestContent: manifest }).diagnostics).toEqual([]);
  });

  it("matches an abbreviated recorded commit against a full HEAD", () => {
    expect(
      computeFirehorseIndexStaleness(RECORDED_COMMIT.slice(0, 10), { headCommit: RECORDED_COMMIT }),
    ).toEqual({ status: "current" });
  });
});
