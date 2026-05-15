import { readFile } from "node:fs/promises";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  DefinitionValidationError,
  assertValidDefinitionSet,
  extractGeneratedProvenance,
  generatedManifestEntries,
  mergeGeneratedManifestEntries,
  parseDefinition,
  parseDefinitionFile,
  projectDefinitions,
  validateDefinitionSet,
} from "./index.js";

const packageRoot = process.cwd();
const repoRoot = path.dirname(path.dirname(packageRoot));
const definitionsRoot = path.join(packageRoot, "definitions");
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

function bodyWithSections(sections: readonly string[]): string {
  return sections.map((section) => `## ${section}\n\nContent.`).join("\n\n");
}

describe("Firehorse definitions", () => {
  it("parses and validates the canonical diagnose-fix fixture set", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(path.join(definitionsRoot, "workflows/diagnose-fix.md")),
      parseDefinitionFile(path.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(
        path.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md"),
      ),
    ]);

    expect(() =>
      assertValidDefinitionSet(definitions, { knownUpstreamSkills }),
    ).not.toThrow();
    expect(definitions.map((definition) => definition.frontmatter.id).sort()).toEqual([
      "diagnose-fix",
      "diagnostic-reviewer",
      "feedback-loop",
    ]);
  });

  it("documents complete v1 examples for the accepted definition contract", async () => {
    const docs = await readFile(
      path.join(repoRoot, "docs/FIREHORSE-DEFINITION-FORMAT.md"),
      "utf8",
    );

    for (const relativePath of [
      "workflows/diagnose-fix.md",
      "skills/feedback-loop.md",
      "agent-roles/diagnostic-reviewer.md",
    ]) {
      const source = await readFile(path.join(definitionsRoot, relativePath), "utf8");
      expect(docs).toContain(source.trim());
    }
  });

  it("reports missing required body sections with actionable diagnostics", () => {
    expect(() =>
      parseDefinition({
        path: path.join(definitionsRoot, "workflows/missing-section.md"),
        content: `---\nschemaVersion: 1\nid: missing-section\nkind: workflow\ntitle: Missing Section\ndescription: Missing section fixture.\n---\n\n## Purpose\n\nOnly one section.`,
      }),
    ).toThrow(DefinitionValidationError);
  });

  it("rejects invalid capability values unless they are extension-prefixed", () => {
    expect(() =>
      parseDefinition({
        path: path.join(definitionsRoot, "workflows/invalid-capability.md"),
        content: `---\nschemaVersion: 1\nid: invalid-capability\nkind: workflow\ntitle: Invalid Capability\ndescription: Invalid capability fixture.\nrequires:\n  tools:\n    - bespoke-tool\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).toThrow(/Unsupported tools capability/);

    expect(() =>
      parseDefinition({
        path: path.join(definitionsRoot, "workflows/extension-capability.md"),
        content: `---\nschemaVersion: 1\nid: extension-capability\nkind: workflow\ntitle: Extension Capability\ndescription: Extension capability fixture.\nrequires:\n  tools:\n    - mcp:github\n---\n\n${bodyWithSections(workflowSections)}`,
      }),
    ).not.toThrow();
  });

  it("validates duplicate ids and structured references across a definition set", async () => {
    const workflow = await parseDefinitionFile(
      path.join(definitionsRoot, "workflows/diagnose-fix.md"),
    );
    const duplicateWorkflow = {
      ...workflow,
      path: path.join(definitionsRoot, "workflows/duplicate.md"),
    };

    expect(validateDefinitionSet([workflow, duplicateWorkflow])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "set.duplicate_id" }),
        expect.objectContaining({ code: "references.skill_missing" }),
        expect.objectContaining({ code: "references.agent_role_missing" }),
      ]),
    );
  });

  it("projects provider mirrors and manifest entries deterministically", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(path.join(definitionsRoot, "workflows/diagnose-fix.md")),
      parseDefinitionFile(path.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(
        path.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md"),
      ),
    ]);
    assertValidDefinitionSet(definitions, { knownUpstreamSkills });

    const generated = projectDefinitions(definitions, {
      repoRoot,
    });

    expect(generated.map((file) => file.path)).toEqual([
      "packages/firehorse-claude/agents/firehorse/horse-diagnostic-reviewer.md",
      "packages/firehorse-claude/commands/firehorse/horse-diagnose-fix.md",
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-pi/agents/firehorse/horse-diagnostic-reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md",
      "packages/firehorse-pi/skills/firehorse/feedback-loop/SKILL.md",
    ]);

    expect(generated[0]?.content).toContain("Generated by Firehorse. DO NOT EDIT.");
    expect(generated[1]?.content).toContain("argument-hint");
    expect(generated[2]?.content).toContain("firehorseSourceSha256");

    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md",
      ],
      packagePiSkills: ["./skills/firehorse/feedback-loop"],
      claudeCommands: ["./commands/firehorse/horse-diagnose-fix.md"],
      claudeAgents: ["./agents/firehorse/horse-diagnostic-reviewer.md"],
    });

    expect(extractGeneratedProvenance(generated[0]?.content ?? "")).toMatchObject({
      firehorseGenerated: true,
      firehorseId: "diagnostic-reviewer",
      firehorseSourceSha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
    expect(extractGeneratedProvenance("# hand-authored\n")).toBeNull();
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
