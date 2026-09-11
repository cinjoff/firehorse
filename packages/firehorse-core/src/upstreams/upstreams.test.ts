import { describe, expect, it } from "vitest";

import type { FirehorseDefinition, WorkflowFrontmatter } from "../definitions/types.js";
import {
  UPSTREAMS_LOCK_SCHEMA_VERSION,
  OutdatedUpstreamsLockfileError,
  UpstreamsLockfileError,
  buildUpstreamsLockfile,
  checkUpstreamSkillUsages,
  collectUpstreamSkillUsages,
  diffUpstreams,
  formatUpstreamDriftReport,
  hashUpstreamSkillSource,
  installedUpstreamSkillKeys,
  lockedUpstreamSkillKeys,
  parseUpstreamsLockfile,
  serialiseUpstreamsLockfile,
  upstreamSkillKey,
  type InstalledUpstreamPlugin,
  type UpstreamsLockfile,
} from "./index.js";

const declared = [{ name: "mattpocock-skills", marketplace: "claude-plugins-official" }] as const;

const WAYFINDER_HASH = "a".repeat(64);
const TDD_HASH = "b".repeat(64);
const TEACH_HASH = "c".repeat(64);

const lockfile: UpstreamsLockfile = {
  schemaVersion: UPSTREAMS_LOCK_SCHEMA_VERSION,
  generatedAt: "2026-09-11T09:24:00.000Z",
  plugins: {
    "mattpocock-skills": {
      marketplace: "claude-plugins-official",
      version: "1.2.3",
      skills: {
        tdd: {
          path: "skills/engineering/tdd/SKILL.md",
          sha256: TDD_HASH,
          nameSource: "frontmatter",
          modelInvocable: true,
        },
        teach: {
          path: "skills/productivity/teach/SKILL.md",
          sha256: TEACH_HASH,
          nameSource: "frontmatter",
          modelInvocable: true,
        },
        wayfinder: {
          path: "skills/engineering/wayfinder/SKILL.md",
          sha256: WAYFINDER_HASH,
          nameSource: "frontmatter",
          modelInvocable: true,
        },
      },
    },
  },
};

function installed(
  skills: readonly { key: string; path: string; sha256: string; modelInvocable?: boolean }[],
  version = "1.2.3",
): readonly InstalledUpstreamPlugin[] {
  return [
    {
      name: "mattpocock-skills",
      marketplace: "claude-plugins-official",
      version,
      skills: skills.map((skill) => ({
        ...skill,
        nameSource: "frontmatter" as const,
        modelInvocable: skill.modelInvocable ?? true,
      })),
    },
  ];
}

const fullyInstalled = installed([
  { key: "tdd", path: "skills/engineering/tdd/SKILL.md", sha256: TDD_HASH },
  { key: "teach", path: "skills/productivity/teach/SKILL.md", sha256: TEACH_HASH },
  {
    key: "wayfinder",
    path: "skills/engineering/wayfinder/SKILL.md",
    sha256: WAYFINDER_HASH,
  },
]);

function workflow(
  id: string,
  upstreamSkills: readonly { upstream: string; id: string }[],
): FirehorseDefinition {
  const frontmatter = {
    schemaVersion: 1,
    id,
    kind: "workflow",
    title: id,
    description: `Fixture workflow ${id}.`,
    upstreamSkills: [...upstreamSkills],
  } as WorkflowFrontmatter;

  return {
    kind: "workflow",
    frontmatter,
    body: "",
    path: `packages/firehorse-core/definitions/workflows/${id}.md`,
    sourceContent: "",
    sourceHash: "0".repeat(64),
  };
}

const definitions = [
  workflow("map-the-work", [{ upstream: "mattpocock-skills", id: "wayfinder" }]),
  workflow("ship-a-change", [
    { upstream: "mattpocock-skills", id: "wayfinder" },
    { upstream: "mattpocock-skills", id: "tdd" },
  ]),
];

const usages = collectUpstreamSkillUsages(definitions);

describe("upstream skill references", () => {
  it("collects every upstreamSkills entry with the workflow that named it", () => {
    expect(usages).toEqual([
      {
        upstream: "mattpocock-skills",
        id: "wayfinder",
        key: "mattpocock-skills:wayfinder",
        workflowId: "map-the-work",
        workflowPath: "packages/firehorse-core/definitions/workflows/map-the-work.md",
      },
      {
        upstream: "mattpocock-skills",
        id: "wayfinder",
        key: "mattpocock-skills:wayfinder",
        workflowId: "ship-a-change",
        workflowPath: "packages/firehorse-core/definitions/workflows/ship-a-change.md",
      },
      {
        upstream: "mattpocock-skills",
        id: "tdd",
        key: "mattpocock-skills:tdd",
        workflowId: "ship-a-change",
        workflowPath: "packages/firehorse-core/definitions/workflows/ship-a-change.md",
      },
    ]);
  });

  it("builds '<upstream>:<id>' keys from both the lockfile and the install", () => {
    expect(upstreamSkillKey("mattpocock-skills", "wayfinder")).toBe("mattpocock-skills:wayfinder");
    expect([...lockedUpstreamSkillKeys(lockfile)].sort()).toEqual([
      "mattpocock-skills:tdd",
      "mattpocock-skills:teach",
      "mattpocock-skills:wayfinder",
    ]);
    expect([...installedUpstreamSkillKeys(fullyInstalled)].sort()).toEqual([
      "mattpocock-skills:tdd",
      "mattpocock-skills:teach",
      "mattpocock-skills:wayfinder",
    ]);
  });
});

describe("drift diffing", () => {
  it("reports nothing when the install matches the baseline", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      installed: fullyInstalled,
      usages,
    });

    expect(report.basis).toBe("installed");
    expect(report.findings).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("treats a vanished referenced skill as breaking and names the workflows", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      // wayfinder renamed to zoom-out: the old key is gone, a new key appeared.
      installed: installed([
        { key: "tdd", path: "skills/engineering/tdd/SKILL.md", sha256: TDD_HASH },
        {
          key: "teach",
          path: "skills/productivity/teach/SKILL.md",
          sha256: TEACH_HASH,
        },
        {
          key: "zoom-out",
          path: "skills/engineering/zoom-out/SKILL.md",
          sha256: WAYFINDER_HASH,
        },
      ]),
      usages,
    });

    expect(report.ok).toBe(false);
    expect(report.breaking).toEqual([
      {
        code: "upstreams.skill_vanished_referenced",
        severity: "breaking",
        plugin: "mattpocock-skills",
        skill: "wayfinder",
        affectedWorkflows: ["map-the-work", "ship-a-change"],
        message:
          "Skill 'mattpocock-skills:wayfinder' is recorded in upstreams.lock.json but absent from the installed plugin. Broken workflows: map-the-work, ship-a-change.",
      },
    ]);
    expect(report.advisory.map((finding) => finding.code)).toEqual(["upstreams.skill_added"]);
  });

  it("treats a vanished unreferenced skill as advisory", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      installed: installed([
        { key: "tdd", path: "skills/engineering/tdd/SKILL.md", sha256: TDD_HASH },
        {
          key: "wayfinder",
          path: "skills/engineering/wayfinder/SKILL.md",
          sha256: WAYFINDER_HASH,
        },
      ]),
      usages,
    });

    expect(report.ok).toBe(true);
    expect(report.advisory).toEqual([
      {
        code: "upstreams.skill_vanished",
        severity: "advisory",
        plugin: "mattpocock-skills",
        skill: "teach",
        message:
          "Skill 'mattpocock-skills:teach' vanished from the installed plugin. No definition references it.",
      },
    ]);
  });

  it("treats a changed body hash as advisory and still names the referencing workflows", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      installed: installed([
        { key: "tdd", path: "skills/engineering/tdd/SKILL.md", sha256: TDD_HASH },
        {
          key: "teach",
          path: "skills/productivity/teach/SKILL.md",
          sha256: TEACH_HASH,
        },
        {
          key: "wayfinder",
          path: "skills/engineering/wayfinder/SKILL.md",
          sha256: "d".repeat(64),
        },
      ]),
      usages,
    });

    expect(report.ok).toBe(true);
    expect(report.advisory).toEqual([
      {
        code: "upstreams.skill_hash_changed",
        severity: "advisory",
        plugin: "mattpocock-skills",
        skill: "wayfinder",
        affectedWorkflows: ["map-the-work", "ship-a-change"],
        message:
          "Skill 'mattpocock-skills:wayfinder' changed content (aaaaaaaaaaaa -> dddddddddddd). Referenced by: map-the-work, ship-a-change.",
      },
    ]);
  });

  it("treats a changed plugin version or marketplace as advisory", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      installed: installed(
        [
          { key: "tdd", path: "skills/engineering/tdd/SKILL.md", sha256: TDD_HASH },
          {
            key: "teach",
            path: "skills/productivity/teach/SKILL.md",
            sha256: TEACH_HASH,
          },
          {
            key: "wayfinder",
            path: "skills/engineering/wayfinder/SKILL.md",
            sha256: WAYFINDER_HASH,
          },
        ],
        "1.3.0",
      ).map((plugin) => ({ ...plugin, marketplace: "impeccable" })),
      usages,
    });

    expect(report.ok).toBe(true);
    expect(report.advisory.map((finding) => finding.code)).toEqual([
      "upstreams.plugin_version_changed",
      "upstreams.plugin_marketplace_changed",
    ]);
  });

  it("treats a declared plugin that is not installed as breaking", () => {
    const report = diffUpstreams({
      declared: [...declared, { name: "impeccable", marketplace: "impeccable" }],
      lockfile,
      installed: fullyInstalled,
      usages,
    });

    expect(report.ok).toBe(false);
    expect(report.breaking.map((finding) => finding.code)).toEqual([
      "upstreams.plugin_not_installed",
    ]);
  });

  it("treats a stale lockfile as breaking in both directions", () => {
    const missingEntry = diffUpstreams({
      declared,
      lockfile: { schemaVersion: UPSTREAMS_LOCK_SCHEMA_VERSION, plugins: {} },
      installed: fullyInstalled,
      usages: [],
    });
    expect(missingEntry.breaking.map((finding) => finding.code)).toEqual([
      "upstreams.lockfile_missing_plugin",
    ]);

    const undeclared = diffUpstreams({
      declared: [],
      lockfile,
      installed: [],
      usages: [],
    });
    expect(undeclared.breaking.map((finding) => finding.code)).toEqual([
      "upstreams.lockfile_undeclared_plugin",
    ]);
  });

  it("degrades to a lockfile-only pass when ~/.claude/plugins/ is missing", () => {
    const report = diffUpstreams({
      declared: [...declared, { name: "impeccable", marketplace: "impeccable" }],
      lockfile,
      installed: null,
      usages,
    });

    expect(report.basis).toBe("lockfile-only");
    expect(report.ok).toBe(true);
    expect(report.findings).toEqual([]);
  });

  it("still fails a reference the lockfile cannot resolve when the install is unreadable", () => {
    const report = diffUpstreams({
      declared,
      lockfile,
      installed: null,
      usages: collectUpstreamSkillUsages([
        workflow("map-the-work", [{ upstream: "mattpocock-skills", id: "zoom-out" }]),
      ]),
    });

    expect(report.basis).toBe("lockfile-only");
    expect(report.ok).toBe(false);
    expect(formatUpstreamDriftReport(report)).toEqual([
      "breaking upstreams.reference_unresolved: Upstream skill 'mattpocock-skills:zoom-out' does not resolve against upstreams.lock.json (~/.claude/plugins/ was not read). Broken workflows: map-the-work.",
    ]);
  });

  it("reports a reference to a skill the baseline never knew about", () => {
    const findings = checkUpstreamSkillUsages({
      usages: collectUpstreamSkillUsages([
        workflow("ship-a-change", [{ upstream: "impeccable", id: "polish" }]),
      ]),
      known: installedUpstreamSkillKeys(fullyInstalled),
      basis: "installed",
    });

    expect(findings).toEqual([
      {
        code: "upstreams.reference_unresolved",
        severity: "breaking",
        skill: "impeccable:polish",
        affectedWorkflows: ["ship-a-change"],
        message:
          "Upstream skill 'impeccable:polish' does not resolve against the plugins installed under ~/.claude/plugins/. Broken workflows: ship-a-change.",
      },
    ]);
  });
});

describe("lockfile serialisation", () => {
  it("hashes the whole SKILL.md and normalises CRLF to LF", () => {
    const lf = "---\nname: tdd\n---\n\nBody\n";
    expect(hashUpstreamSkillSource(lf.replaceAll("\n", "\r\n"))).toBe(hashUpstreamSkillSource(lf));
    expect(hashUpstreamSkillSource("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    expect(hashUpstreamSkillSource(lf)).not.toBe(
      hashUpstreamSkillSource(lf.replace("tdd", "tdd2")),
    );
  });

  it("serialises plugins by name and skills by key, ASCII-sorted", () => {
    const built = buildUpstreamsLockfile({
      generatedAt: "2026-09-11T09:24:00.000Z",
      plugins: [
        {
          name: "impeccable",
          marketplace: "impeccable",
          version: "0.1.0",
          skills: [],
        },
        {
          name: "mattpocock-skills",
          marketplace: "claude-plugins-official",
          version: "1.2.3",
          skills: [
            {
              key: "wayfinder",
              path: "skills/engineering/wayfinder/SKILL.md",
              sha256: WAYFINDER_HASH,
              nameSource: "frontmatter",
              modelInvocable: true,
            },
            {
              key: "Teach",
              path: "skills/productivity/teach/SKILL.md",
              sha256: TEACH_HASH,
              nameSource: "directory",
              modelInvocable: true,
            },
            {
              key: "tdd",
              path: "skills/engineering/tdd/SKILL.md",
              sha256: TDD_HASH,
              nameSource: "frontmatter",
              modelInvocable: true,
            },
          ],
        },
      ],
    });

    const serialised = serialiseUpstreamsLockfile(built);

    expect(serialised).toBe(
      `{
  "schemaVersion": 2,
  "generatedAt": "2026-09-11T09:24:00.000Z",
  "plugins": {
    "impeccable": {
      "marketplace": "impeccable",
      "version": "0.1.0",
      "skills": {}
    },
    "mattpocock-skills": {
      "marketplace": "claude-plugins-official",
      "version": "1.2.3",
      "skills": {
        "Teach": {
          "path": "skills/productivity/teach/SKILL.md",
          "sha256": "${TEACH_HASH}",
          "nameSource": "directory",
          "modelInvocable": true
        },
        "tdd": {
          "path": "skills/engineering/tdd/SKILL.md",
          "sha256": "${TDD_HASH}",
          "nameSource": "frontmatter",
          "modelInvocable": true
        },
        "wayfinder": {
          "path": "skills/engineering/wayfinder/SKILL.md",
          "sha256": "${WAYFINDER_HASH}",
          "nameSource": "frontmatter",
          "modelInvocable": true
        }
      }
    }
  }
}
`,
    );

    // Uppercase sorts before lowercase: ASCII order, not locale order.
    expect(serialised.indexOf('"Teach"')).toBeLessThan(serialised.indexOf('"tdd"'));
    expect(serialiseUpstreamsLockfile(parseUpstreamsLockfile(serialised))).toBe(serialised);
  });

  it("omits generatedAt unless --write supplied it", () => {
    const built = buildUpstreamsLockfile({ plugins: [] });
    expect(built.generatedAt).toBeUndefined();
    expect(serialiseUpstreamsLockfile(built)).toBe(
      '{\n  "schemaVersion": 2,\n  "plugins": {}\n}\n',
    );
  });

  it("rejects a lockfile that does not match the schema", () => {
    expect(() => parseUpstreamsLockfile("{")).toThrow(UpstreamsLockfileError);
    expect(() => parseUpstreamsLockfile('{"schemaVersion": 99, "plugins": {}}')).toThrow(
      UpstreamsLockfileError,
    );
    expect(() =>
      parseUpstreamsLockfile(
        '{"schemaVersion": 2, "plugins": {"p": {"marketplace": "m", "version": "1", "skills": {"s": {"path": "a", "sha256": "NOTAHASH", "nameSource": "frontmatter", "modelInvocable": true}}}}}',
      ),
    ).toThrow(/SHA-256/);
  });

  it("names an older baseline as regenerable rather than as drift", () => {
    const error = (() => {
      try {
        parseUpstreamsLockfile('{"schemaVersion": 1, "plugins": {}}');
        return null;
      } catch (caught) {
        return caught;
      }
    })();

    expect(error).toBeInstanceOf(OutdatedUpstreamsLockfileError);
    expect((error as OutdatedUpstreamsLockfileError).recordedSchemaVersion).toBe(1);
    expect((error as Error).message).toContain("--write");
  });

  it("refuses two skills claiming the same key", () => {
    expect(() =>
      buildUpstreamsLockfile({
        plugins: [
          {
            name: "mattpocock-skills",
            marketplace: "claude-plugins-official",
            version: "1.2.3",
            skills: [
              {
                key: "tdd",
                path: "skills/a/SKILL.md",
                sha256: TDD_HASH,
                nameSource: "frontmatter",
                modelInvocable: true,
              },
              {
                key: "tdd",
                path: "skills/b/SKILL.md",
                sha256: TEACH_HASH,
                nameSource: "directory",
                modelInvocable: true,
              },
            ],
          },
        ],
      }),
    ).toThrow(UpstreamsLockfileError);
  });
});
