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
  parseDefinitionFile,
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
const agentRoleSections = [
  "Mission",
  "Responsibilities",
  "Inputs",
  "Outputs",
  "Tools",
  "Authority",
  "Escalation",
  "Collaboration",
  "Boundaries",
  "Projection Notes",
];

function bodyWithSections(sections: readonly string[]): string {
  return sections.map((section) => `## ${section}\n\nContent.`).join("\n\n");
}

describe("Firehorse definitions", () => {
  it("parses and validates the canonical diagnose-fix fixture set", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/diagnose-fix.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md")),
    ]);

    expect(() => assertValidDefinitionSet(definitions, { knownUpstreamSkills })).not.toThrow();
    expect(definitions.map((definition) => definition.frontmatter.id).sort()).toEqual([
      "diagnose-fix",
      "diagnostic-reviewer",
      "feedback-loop",
    ]);
  });

  it("documents complete v1 examples for the accepted definition contract", async () => {
    const docs = await readFile(
      nodePath.join(repoRoot, "docs/FIREHORSE-DEFINITION-FORMAT.md"),
      "utf8",
    );

    for (const relativePath of [
      "workflows/diagnose-fix.md",
      "skills/feedback-loop.md",
      "agent-roles/diagnostic-reviewer.md",
    ]) {
      const source = await readFile(nodePath.join(definitionsRoot, relativePath), "utf8");
      expect(docs).toContain(source.trim());
    }
  });

  it("documents generated mirror maintenance and deferred runtime boundaries", async () => {
    const docs = await readFile(
      nodePath.join(repoRoot, "docs/FIREHORSE-DEFINITION-FORMAT.md"),
      "utf8",
    );

    expect(docs).toContain("pnpm definitions:write");
    expect(docs).toContain("pnpm definitions:check");
    expect(docs).toContain("firehorseSourceSha256");
    expect(docs).toContain("horse-new-project");
    expect(docs).toContain("horse-map-codebase");
    expect(docs).toContain("Firehorse runtime loading or execution");
    expect(docs).toContain("Provider API transports for Claude, Codex, or Pi");
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

  it("validates duplicate ids and structured references across a definition set", async () => {
    const workflow = await parseDefinitionFile(
      nodePath.join(definitionsRoot, "workflows/diagnose-fix.md"),
    );
    const duplicateWorkflow = {
      ...workflow,
      path: nodePath.join(definitionsRoot, "workflows/duplicate.md"),
    };

    expect(validateDefinitionSet([workflow, duplicateWorkflow])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "set.duplicate_id" }),
        expect.objectContaining({ code: "references.skill_missing" }),
        expect.objectContaining({ code: "references.agent_role_missing" }),
      ]),
    );
  });

  it("validates aliases and deprecation replacements across a definition set", async () => {
    const existingSkill = await parseDefinitionFile(
      nodePath.join(definitionsRoot, "skills/feedback-loop.md"),
    );
    const deprecatedSkill = parseDefinition({
      path: nodePath.join(definitionsRoot, "skills/old-feedback-loop.md"),
      content: `---\nschemaVersion: 1\nid: old-feedback-loop\nkind: skill\ntitle: Old Feedback Loop\ndescription: Deprecated feedback-loop fixture.\naliases:\n  - feedback-loop\ndeprecated: true\nreplacedBy: missing-feedback-loop\n---\n\n${bodyWithSections(skillSections)}`,
    });

    expect(validateDefinitionSet([existingSkill, deprecatedSkill])).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "set.alias_collides_with_id" }),
        expect.objectContaining({ code: "set.replacement_missing" }),
      ]),
    );
  });

  it("validates workflow references by kind and known upstream skill", async () => {
    const skill = await parseDefinitionFile(
      nodePath.join(definitionsRoot, "skills/feedback-loop.md"),
    );
    const role = await parseDefinitionFile(
      nodePath.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md"),
    );
    const workflow = parseDefinition({
      path: nodePath.join(definitionsRoot, "workflows/reference-fixture.md"),
      content: `---\nschemaVersion: 1\nid: reference-fixture\nkind: workflow\ntitle: Reference Fixture\ndescription: Reference validation fixture.\nsupportingSkills:\n  - id: diagnostic-reviewer\nagentRoles:\n  - id: feedback-loop\nupstreamSkills:\n  - upstream: unknown-upstream\n    id: diagnose\n---\n\n${bodyWithSections(workflowSections)}`,
    });

    expect(validateDefinitionSet([workflow, skill, role], { knownUpstreamSkills })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "references.skill_wrong_kind" }),
        expect.objectContaining({ code: "references.agent_role_wrong_kind" }),
        expect.objectContaining({ code: "references.upstream_skill_missing" }),
      ]),
    );
  });

  it("validates agent role metadata before projection", () => {
    const role = parseDefinition({
      path: nodePath.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md"),
      content: `---\nschemaVersion: 1\nid: diagnostic-reviewer\nkind: agent-role\nname: other-reviewer\ntitle: Diagnostic Reviewer\ndescription: Agent role metadata validation fixture.\n---\n\n${bodyWithSections(agentRoleSections)}`,
    });

    expect(validateDefinitionSet([role])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "agent_role.name_id_mismatch" })]),
    );
  });

  it("projects provider mirrors and manifest entries deterministically", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/diagnose-fix.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md")),
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
      rootPiPrompts: ["./packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md"],
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

  it("renders feedback-loop skill mirrors with canonical instructions and exact source hashes", async () => {
    const sourcePath = nodePath.join(definitionsRoot, "skills/feedback-loop.md");
    const sourceContent = await readFile(sourcePath, "utf8");
    const feedbackLoop = await parseDefinitionFile(sourcePath);
    const generated = projectDefinitions([feedbackLoop], { repoRoot });
    const expectedHash = createHash("sha256").update(sourceContent).digest("hex");

    expect(generated.map((file) => file.path)).toEqual([
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-pi/skills/firehorse/feedback-loop/SKILL.md",
    ]);
    for (const file of generated) {
      expect(file.sourceHash).toBe(expectedHash);
      expect(file.content).toContain("# Feedback Loop");
      expect(file.content).toContain("## Instructions");
      expect(file.content).toContain("Do not invent a passing result.");
      expect(extractGeneratedProvenance(file.content)).toMatchObject({
        firehorseId: "feedback-loop",
        firehorseSourceSha256: expectedHash,
      });
    }
  });

  it("adapts diagnostic-reviewer role mirrors for Pi and Claude provider surfaces", async () => {
    const role = await parseDefinitionFile(
      nodePath.join(definitionsRoot, "agent-roles/diagnostic-reviewer.md"),
    );
    assertValidDefinitionSet([role]);

    const generated = projectDefinitions([role], { repoRoot });
    const claude = generated.find((file) => file.provider === "claude");
    const pi = generated.find((file) => file.provider === "pi");

    expect(claude?.path).toBe(
      "packages/firehorse-claude/agents/firehorse/horse-diagnostic-reviewer.md",
    );
    expect(claude?.content).toContain('name: "horse-diagnostic-reviewer"');
    expect(claude?.content).toContain('tools: "Read, Grep, Glob, LS, Bash"');
    expect(claude?.content).toContain('effort: "high"');
    expect(claude?.content).not.toContain("systemPromptMode");
    expect(claude?.content).not.toContain("defaultReads");
    expect(claude?.content).toContain("## Mission");

    expect(pi?.path).toBe("packages/firehorse-pi/agents/firehorse/horse-diagnostic-reviewer.md");
    expect(pi?.content).toContain('name: "horse-diagnostic-reviewer"');
    expect(pi?.content).toContain('tools: "read, grep, find, ls, bash"');
    expect(pi?.content).toContain('systemPromptMode: "replace"');
    expect(pi?.content).toContain('defaultReads: "progress.md"');
    expect(pi?.content).toContain("maxSubagentDepth: 0");
    expect(pi?.content).toContain("## Mission");
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
