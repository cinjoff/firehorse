import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import nodePath from "node:path";

import { describe, expect, it } from "vitest";

import {
  DefinitionValidationError,
  assertValidDefinitionSet,
  extractGeneratedProvenance,
  generatedManifestEntries,
  mergeGeneratedManifestEntries,
  parseDefinition,
  projectDefinitions,
  validateDefinitionSet,
} from "./index.js";

const packageRoot = process.cwd();
const repoRoot = nodePath.dirname(nodePath.dirname(packageRoot));
const definitionsRoot = nodePath.join(packageRoot, "definitions");
const knownUpstreamSkills = new Set(["mattpocock-skills:diagnose"]);

const workflowSections = [
  "Purpose",
  "Usage",
  "Inputs",
  "Outputs",
  "Supporting Capabilities",
  "Orchestration Intent",
  "Safety Gates",
  "Procedure",
  "Projection Notes",
];
const skillSections = [
  "Purpose",
  "Usage",
  "Inputs",
  "Outputs",
  "Instructions",
  "Boundaries",
  "Examples",
  "Projection Notes",
];

function bodyWithSections(sections: readonly string[]): string {
  return sections.map((section) => `## ${section}\n\nContent.`).join("\n\n");
}

function titleFor(id: string): string {
  return id
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function workflowPath(id: string): string {
  return nodePath.join(definitionsRoot, `workflows/${id}.md`);
}

function skillPath(id: string): string {
  return nodePath.join(definitionsRoot, `skills/${id}.md`);
}

/** Canonical workflow source text; `extraFrontmatter` lines are appended verbatim. */
function workflowSource(id: string, extraFrontmatter = ""): string {
  return `---
schemaVersion: 1
id: ${id}
kind: workflow
title: ${titleFor(id)}
description: Workflow fixture for ${id}.
argumentHint: <freeform bug report>
requires:
  tools:
    - read
  environment:
    - filesystem
${extraFrontmatter}---

# ${titleFor(id)}

${bodyWithSections(workflowSections)}
`;
}

/** Canonical skill source text; `extraFrontmatter` lines are appended verbatim. */
function skillSource(id: string, extraFrontmatter = ""): string {
  return `---
schemaVersion: 1
id: ${id}
kind: skill
title: ${titleFor(id)}
description: Skill fixture for ${id}.
requires:
  tools:
    - read
  environment:
    - filesystem
${extraFrontmatter}---

# ${titleFor(id)}

${bodyWithSections(skillSections)}
`;
}

function parseWorkflow(id: string, extraFrontmatter = "") {
  return parseDefinition({
    path: workflowPath(id),
    content: workflowSource(id, extraFrontmatter),
  });
}

function parseSkill(id: string, extraFrontmatter = "") {
  return parseDefinition({
    path: skillPath(id),
    content: skillSource(id, extraFrontmatter),
  });
}

describe("Firehorse definitions", () => {
  it("parses and validates a canonical workflow and skill fixture set", () => {
    const definitions = [
      parseWorkflow(
        "diagnose-fix",
        "supportingSkills:\n  - id: feedback-loop\nupstreamSkills:\n  - upstream: mattpocock-skills\n    id: diagnose\n",
      ),
      parseSkill("feedback-loop"),
    ];

    expect(() =>
      assertValidDefinitionSet(definitions, { knownUpstreamSkills }),
    ).not.toThrow();
    expect(definitions.map((definition) => definition.frontmatter.id).sort()).toEqual([
      "diagnose-fix",
      "feedback-loop",
    ]);
    expect(definitions.map((definition) => definition.kind).sort()).toEqual([
      "skill",
      "workflow",
    ]);
  });

  it("documents generated mirror maintenance and deferred runtime boundaries", async () => {
    const docs = await readFile(
      nodePath.join(repoRoot, "docs/FIREHORSE-DEFINITION-FORMAT.md"),
      "utf8",
    );

    expect(docs).toContain("pnpm definitions:write");
    expect(docs).toContain("pnpm definitions:check");
    expect(docs).toContain("firehorseSourceSha256");
    expect(docs).toContain("Firehorse runtime loading or execution");
  });

  it("reports invalid frontmatter with actionable diagnostics", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/invalid-frontmatter.md"),
        content: `---\nschemaVersion: 2\nid: invalid-frontmatter\nkind: workflow\ntitle: Invalid Frontmatter\ndescription: Invalid frontmatter fixture.\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/frontmatter.invalid_value.*schemaVersion/);
  });

  it("reports malformed frontmatter before validating the definition body", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/malformed-frontmatter.md"),
        content: `---\nschemaVersion: [\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/frontmatter.parse/);
  });

  it("rejects unknown frontmatter fields", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/unknown-frontmatter.md"),
        content: `---\nschemaVersion: 1\nid: unknown-frontmatter\nkind: workflow\ntitle: Unknown Frontmatter\ndescription: Unknown frontmatter fixture.\nruntime: execute\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/frontmatter.unrecognized_keys.*runtime/);
  });

  it("enforces definition id and path consistency", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/different-id.md"),
        content: `---\nschemaVersion: 1\nid: path-mismatch\nkind: workflow\ntitle: Path Mismatch\ndescription: Path mismatch fixture.\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/path.id_mismatch/);
  });

  it("reports missing required body sections with actionable diagnostics", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/missing-section.md"),
        content: `---\nschemaVersion: 1\nid: missing-section\nkind: workflow\ntitle: Missing Section\ndescription: Missing section fixture.\n---\n\n## Purpose\n\nOnly one section.`,
      }),
    ).toThrow(DefinitionValidationError);
  });

  it("rejects invalid capability values unless they are extension-prefixed", () => {
    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/invalid-capability.md"),
        content: `---\nschemaVersion: 1\nid: invalid-capability\nkind: workflow\ntitle: Invalid Capability\ndescription: Invalid capability fixture.\nrequires:\n  tools:\n    - bespoke-tool\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/Unsupported tools capability/);

    expect(() =>
      parseDefinition({
        path: nodePath.join(definitionsRoot, "workflows/extension-capability.md"),
        content: `---\nschemaVersion: 1\nid: extension-capability\nkind: workflow\ntitle: Extension Capability\ndescription: Extension capability fixture.\nrequires:\n  tools:\n    - mcp:github\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).not.toThrow();
  });

  it("validates duplicate ids and structured references across a definition set", () => {
    const workflow = parseWorkflow(
      "diagnose-fix",
      "supportingSkills:\n  - id: feedback-loop\n",
    );
    const duplicateWorkflow = {
      ...workflow,
      path: nodePath.join(definitionsRoot, "workflows/duplicate.md"),
    };

    expect(validateDefinitionSet([workflow, duplicateWorkflow])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "set.duplicate_id" }),
        expect.objectContaining({ code: "references.skill_missing" }),
      ]),
    );
  });

  it("validates aliases and deprecation replacements across a definition set", () => {
    const existingSkill = parseSkill("feedback-loop");
    const deprecatedSkill = parseSkill(
      "old-feedback-loop",
      "aliases:\n  - feedback-loop\ndeprecated: true\nreplacedBy: missing-feedback-loop\n",
    );

    expect(validateDefinitionSet([existingSkill, deprecatedSkill])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "set.alias_collides_with_id" }),
        expect.objectContaining({ code: "set.replacement_missing" }),
      ]),
    );
  });

  it("validates workflow references by kind and known upstream skill", () => {
    const skill = parseSkill("feedback-loop");
    const referencedWorkflow = parseWorkflow("target-workflow");
    const workflow = parseWorkflow(
      "reference-fixture",
      "supportingSkills:\n  - id: target-workflow\nupstreamSkills:\n  - upstream: unknown-upstream\n    id: diagnose\n",
    );

    expect(
      validateDefinitionSet([workflow, skill, referencedWorkflow], {
        knownUpstreamSkills,
      }),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "references.skill_wrong_kind" }),
        expect.objectContaining({ code: "references.upstream_skill_missing" }),
      ]),
    );
  });

  it("projects Claude mirrors and manifest entries deterministically", () => {
    const definitions = [
      parseWorkflow("diagnose-fix", "supportingSkills:\n  - id: feedback-loop\n"),
      parseSkill("feedback-loop"),
    ];
    assertValidDefinitionSet(definitions);

    const generated = projectDefinitions(definitions, { repoRoot });

    expect(generated.map((file) => file.path)).toEqual([
      "packages/firehorse-claude/commands/firehorse/horse-diagnose-fix.md",
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
    ]);
    expect(generated.map((file) => file.provider)).toEqual(["claude", "claude"]);
    expect(generated.map((file) => file.resourceKind)).toEqual(["workflow", "skill"]);

    expect(generated[0]?.content).toContain("Generated by Firehorse. DO NOT EDIT.");
    expect(generated[0]?.content).toContain("argument-hint");
    expect(generated[0]?.content).toContain("## Procedure");
    expect(generated[1]?.content).toContain('name: "feedback-loop"');
    expect(generated[1]?.content).toContain("## Instructions");

    expect(generatedManifestEntries(generated)).toEqual({
      claudeCommands: ["./commands/firehorse/horse-diagnose-fix.md"],
      claudeSkills: ["./skills/firehorse/feedback-loop"],
    });

    // Projection order does not depend on input order.
    expect(
      projectDefinitions([...definitions].reverse(), { repoRoot }).map(
        (file) => file.path,
      ),
    ).toEqual(generated.map((file) => file.path));
  });

  it("stamps generated mirrors with provenance and a SHA-256 source hash", () => {
    const workflowContent = workflowSource("diagnose-fix");
    const skillContent = skillSource("feedback-loop");
    const definitions = [
      parseDefinition({ path: workflowPath("diagnose-fix"), content: workflowContent }),
      parseDefinition({ path: skillPath("feedback-loop"), content: skillContent }),
    ];
    const expectedHashes = new Map([
      ["diagnose-fix", createHash("sha256").update(workflowContent).digest("hex")],
      ["feedback-loop", createHash("sha256").update(skillContent).digest("hex")],
    ]);

    const generated = projectDefinitions(definitions, { repoRoot });
    expect(generated).toHaveLength(2);

    for (const file of generated) {
      const expectedHash = expectedHashes.get(file.definitionId);
      expect(expectedHash).toMatch(/^[a-f0-9]{64}$/);
      expect(file.sourceHash).toBe(expectedHash);
      expect(file.content).toContain(`Source SHA-256: ${expectedHash}`);
      expect(extractGeneratedProvenance(file.content)).toEqual({
        firehorseGenerated: true,
        firehorseKind: file.resourceKind,
        firehorseId: file.definitionId,
        firehorseSource: file.sourcePath,
        firehorseSourceSha256: expectedHash,
        firehorseSchemaVersion: 1,
      });
      expect(file.sourcePath).toBe(
        `packages/firehorse-core/definitions/${file.resourceKind}s/${file.definitionId}.md`,
      );
    }

    expect(extractGeneratedProvenance("# hand-authored\n")).toBeNull();
    expect(extractGeneratedProvenance("---\nname: hand-authored\n---\n\nBody.\n")).toBeNull();
  });

  it("writes generated manifest entries in deterministic sorted order", () => {
    const definitions = [
      parseWorkflow("zeta-workflow"),
      parseSkill("zeta-loop"),
      parseWorkflow("alpha-workflow"),
      parseSkill("alpha-loop"),
    ];

    const sortedEntries = {
      claudeCommands: [
        "./commands/firehorse/horse-alpha-workflow.md",
        "./commands/firehorse/horse-zeta-workflow.md",
      ],
      claudeSkills: ["./skills/firehorse/alpha-loop", "./skills/firehorse/zeta-loop"],
    };

    expect(generatedManifestEntries(projectDefinitions(definitions, { repoRoot }))).toEqual(
      sortedEntries,
    );
    // The same set in any input order produces byte-identical manifest entries.
    expect(
      generatedManifestEntries(
        [...definitions].reverse().flatMap((definition) =>
          projectDefinitions([definition], { repoRoot }),
        ),
      ),
    ).toEqual(sortedEntries);
  });

  it("replaces only generated manifest entries for deterministic stale cleanup", () => {
    expect(
      mergeGeneratedManifestEntries(
        [
          "./skills/firehorse-setup",
          "./skills/firehorse/old-generated",
          "./skills/mattpocock/engineering/diagnose",
        ],
        ["./skills/firehorse/feedback-loop"],
        "./skills/firehorse/",
      ),
    ).toEqual([
      "./skills/firehorse-setup",
      "./skills/mattpocock/engineering/diagnose",
      "./skills/firehorse/feedback-loop",
    ]);
  });
});
