import { describe, expect, it } from "vitest";

import {
  FirehorseSetupManifestError,
  checkFirehorseSetup,
  parseFirehorseSetupManifest,
  validateFirehorseSetupManifest,
} from "./index.js";

const manifest = JSON.stringify({
  schemaVersion: 1,
  project: {
    name: "firehorse",
  },
  github: {
    owner: "cinjoff",
    repo: "firehorse",
  },
  memory: {
    project: "firehorse",
  },
  tracker: {
    project: {
      name: "firehorse",
      id: "PVT_kwDOExample",
    },
    status: {
      field: {
        name: "Status",
        id: "PVTSSF_example",
      },
      options: [
        {
          name: "Backlog",
          id: "f75ad846",
        },
        {
          name: "In progress",
          id: "47fc9ee4",
        },
        {
          name: "Done",
          id: "98236657",
        },
      ],
    },
  },
  labels: {
    vocabulary: ["ready-for-agent", "blocked", "bug"],
  },
  safeApply: {
    defaultMode: "read-only",
    mutationPolicy: "explicit-operator-approval",
  },
});

describe("Firehorse setup manifest", () => {
  it("parses the setup contract fields used by session-start validation", () => {
    const parsed = parseFirehorseSetupManifest(manifest);

    expect(parsed).toMatchObject({
      project: { name: "firehorse" },
      github: { owner: "cinjoff", repo: "firehorse" },
      memory: { project: "firehorse" },
      tracker: {
        project: { name: "firehorse", id: "PVT_kwDOExample" },
        status: {
          field: { name: "Status", id: "PVTSSF_example" },
          options: [
            { name: "Backlog", id: "f75ad846" },
            { name: "In progress", id: "47fc9ee4" },
            { name: "Done", id: "98236657" },
          ],
        },
      },
      labels: { vocabulary: ["ready-for-agent", "blocked", "bug"] },
      safeApply: { defaultMode: "read-only", mutationPolicy: "explicit-operator-approval" },
    });
  });

  it("rejects manifests that are not read-only by default", () => {
    const unsafeManifest = manifest.replace('"defaultMode":"read-only"', '"defaultMode":"apply"');

    expect(() => parseFirehorseSetupManifest(unsafeManifest)).toThrow(FirehorseSetupManifestError);
  });

  it("is disabled and silent when no manifest or Firehorse markers are present", () => {
    expect(checkFirehorseSetup({})).toEqual({
      enabled: false,
      healthy: true,
      markerPaths: [],
      diagnostics: [],
    });
  });

  it("reports missing setup as an actionable read-only gap when markers are present", () => {
    const result = checkFirehorseSetup({ markerPaths: [".firehorse"] });

    expect(result.enabled).toBe(true);
    expect(result.healthy).toBe(false);
    expect(result.diagnostics).toMatchObject([
      {
        code: "setup_manifest.missing",
        severity: "warning",
        path: ".firehorse/manifest.json",
      },
    ]);
  });

  it("stays silent when manifest and observed setup match", () => {
    const result = checkFirehorseSetup({
      manifestContent: manifest,
      observed: {
        projectName: "firehorse",
        github: { owner: "cinjoff", repo: "firehorse" },
        memoryProject: "firehorse",
        tracker: {
          projectId: "PVT_kwDOExample",
          statusFieldId: "PVTSSF_example",
          statusOptions: [
            { name: "Backlog", id: "f75ad846" },
            { name: "In progress", id: "47fc9ee4" },
            { name: "Done", id: "98236657" },
          ],
        },
        labels: ["ready-for-agent", "blocked", "bug"],
      },
    });

    expect(result.enabled).toBe(true);
    expect(result.healthy).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it("detects setup drift without mutating provider state", () => {
    const parsed = parseFirehorseSetupManifest(manifest);
    const diagnostics = validateFirehorseSetupManifest(parsed, {
      projectName: "other-project",
      github: { owner: "cinjoff", repo: "other-repo" },
      memoryProject: "other-memory-project",
      tracker: {
        projectId: "PVT_kwDOOther",
        statusFieldId: "PVTSSF_other",
        statusOptions: [
          { name: "Backlog", id: "changed" },
          { name: "Done", id: "98236657" },
        ],
      },
      labels: ["ready-for-agent"],
    });

    expect(diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      "setup_manifest.project_name_drift",
      "setup_manifest.github_repo_drift",
      "setup_manifest.memory_project_drift",
      "setup_manifest.tracker_project_id_drift",
      "setup_manifest.status_field_id_drift",
      "setup_manifest.status_option_id_drift",
      "setup_manifest.status_option_missing",
      "setup_manifest.label_missing",
      "setup_manifest.label_missing",
    ]);
  });
});
