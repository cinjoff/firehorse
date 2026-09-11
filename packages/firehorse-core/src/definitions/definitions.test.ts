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
const knownUpstreamSkills = new Set([
  "mattpocock-skills:diagnose",
  "mattpocock-skills:grill-with-docs",
  "mattpocock-skills:tdd",
  "mattpocock-skills:to-issues",
  "mattpocock-skills:to-prd",
]);

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

function expectWorkflowReferences(
  definition: Awaited<ReturnType<typeof parseDefinitionFile>>,
  expected: {
    readonly supportingSkills?: readonly string[];
    readonly agentRoles?: readonly string[];
    readonly upstreamSkills?: readonly string[];
  },
): void {
  expect(definition.kind).toBe("workflow");
  if (definition.kind !== "workflow") {
    throw new Error(`Expected workflow definition, received ${definition.kind}`);
  }

  expect(definition.frontmatter.supportingSkills?.map((reference) => reference.id) ?? []).toEqual(
    expected.supportingSkills ?? [],
  );
  expect(definition.frontmatter.agentRoles?.map((reference) => reference.id) ?? []).toEqual(
    expected.agentRoles ?? [],
  );
  expect(
    definition.frontmatter.upstreamSkills?.map(
      (reference) => `${reference.upstream}:${reference.id}`,
    ) ?? [],
  ).toEqual(expected.upstreamSkills ?? []);
}

describe("Firehorse definitions", () => {
  it("parses and validates the canonical fix-bug fixture set", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/fix-bug.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);

    expect(() => assertValidDefinitionSet(definitions, { knownUpstreamSkills })).not.toThrow();
    expect(definitions.map((definition) => definition.frontmatter.id).sort()).toEqual([
      "feedback-loop",
      "fix-bug",
      "reviewer",
      "verification-contract",
    ]);
  });

  it("validates and projects the PRD-002 supporting review definitions", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/plan-reviewer.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);

    expect(() => assertValidDefinitionSet(definitions)).not.toThrow();
    expect(definitions.map((definition) => definition.frontmatter.id).sort()).toEqual([
      "plan-reviewer",
      "reviewer",
      "verification-contract",
    ]);

    const generated = projectDefinitions(definitions, { repoRoot });

    expect(generated.map((file) => file.path)).toEqual([
      "packages/firehorse-claude/agents/plan-reviewer.md",
      "packages/firehorse-claude/agents/reviewer.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/plan-reviewer.md",
      "packages/firehorse-pi/agents/reviewer.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      packagePiSkills: ["./skills/firehorse/verification-contract"],
      claudeAgents: ["./agents/plan-reviewer.md", "./agents/reviewer.md"],
      claudeSkills: ["./skills/firehorse/verification-contract"],
    });

    for (const file of generated) {
      expect(extractGeneratedProvenance(file.content)).toMatchObject({
        firehorseId: file.definitionId,
        firehorseSourceSha256: file.sourceHash,
      });
    }
    expect(
      generated.find((file) => file.definitionId === "verification-contract")?.content,
    ).toContain("expected behaviors");
    expect(generated.find((file) => file.definitionId === "plan-reviewer")?.content).toContain(
      "product, technical, and execution",
    );
    expect(generated.find((file) => file.definitionId === "reviewer")?.content).toContain(
      "correctness",
    );
  });

  it("projects plan-review as an independently invokable PRD review workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/plan-review.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/plan-reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions);
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["verification-contract"],
      agentRoles: ["plan-reviewer"],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/plan-reviewer.md",
      "packages/firehorse-claude/commands/firehorse/horse-plan-review.md",
      "packages/firehorse-claude/commands/firehorse/plan-review.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/plan-reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/horse-plan-review.md",
      "packages/firehorse-pi/prompts/firehorse/plan-review.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/horse-plan-review.md",
        "./packages/firehorse-pi/prompts/firehorse/plan-review.md",
      ],
      claudeCommands: [
        "./commands/firehorse/horse-plan-review.md",
        "./commands/firehorse/plan-review.md",
      ],
      claudeAgents: ["./agents/plan-reviewer.md"],
    });

    const workflow = generated.find((file) => file.definitionId === "plan-review");
    expect(workflow?.content).toContain("product, technical, and execution");
    expect(workflow?.content).toContain("findings, challenged assumptions, required decisions");
    expect(workflow?.content).toContain("whether issue breakdown can proceed");
    expect(extractGeneratedProvenance(workflow?.content ?? "")).toMatchObject({
      firehorseId: "plan-review",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("projects create-plan as a durable Planning Workspace workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/create-plan.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/plan-reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions, { knownUpstreamSkills });
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["verification-contract"],
      agentRoles: ["plan-reviewer"],
      upstreamSkills: [
        "mattpocock-skills:grill-with-docs",
        "mattpocock-skills:to-prd",
        "mattpocock-skills:to-issues",
      ],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/plan-reviewer.md",
      "packages/firehorse-claude/commands/firehorse/horse-create-plan.md",
      "packages/firehorse-claude/commands/firehorse/plan-work.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/plan-reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/horse-create-plan.md",
      "packages/firehorse-pi/prompts/firehorse/plan-work.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/horse-create-plan.md",
        "./packages/firehorse-pi/prompts/firehorse/plan-work.md",
      ],
      claudeCommands: [
        "./commands/firehorse/horse-create-plan.md",
        "./commands/firehorse/plan-work.md",
      ],
      claudeAgents: ["./agents/plan-reviewer.md"],
    });

    const workflow = generated.find((file) => file.definitionId === "create-plan");
    const workflowContent = workflow?.content ?? "";
    expect(workflowContent).toContain("Planning Workspace artifact contract");
    expect(workflowContent).toContain("docs/prds/prd-000N-<slug>/");
    expect(workflowContent).toContain("`ASK.md`");
    expect(workflowContent).toContain("`context/`");
    expect(workflowContent).toContain("Codebase Map gaps");
    expect(workflowContent).toContain("do not create or refresh them in `create-plan`");
    expect(workflowContent).toContain("memory findings even when empty");
    expect(workflowContent).toContain("durable research and scouting artifacts");
    expect(workflowContent).toContain("batch independent grilling questions");
    expect(workflowContent).toContain(
      "write Planning Decisions to the Planning Workspace's local `DECISIONS.md` as they are resolved",
    );
    expect(workflowContent).toContain("Issue Drafts from the PRD Draft");
    expect(workflowContent).toContain(
      "publish the parent Published Issue before child Published Issues",
    );
    expect(workflowContent).toContain("Recommend `plan-review` before issue breakdown");
    expect(extractGeneratedProvenance(workflowContent)).toMatchObject({
      firehorseId: "create-plan",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("projects new-project as the GitHub repository and Tracker Project setup workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/new-project.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
    ]);
    assertValidDefinitionSet(definitions);
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["verification-contract"],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/commands/firehorse/horse-new-project.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/prompts/firehorse/horse-new-project.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: ["./packages/firehorse-pi/prompts/firehorse/horse-new-project.md"],
      claudeCommands: ["./commands/firehorse/horse-new-project.md"],
      packagePiSkills: ["./skills/firehorse/verification-contract"],
    });

    const workflow = generated.find((file) => file.definitionId === "new-project");
    const workflowContent = workflow?.content ?? "";
    expect(workflowContent).toContain("create or configure a GitHub-backed Firehorse project");
    expect(workflowContent).toContain("creating or changing GitHub resources");
    expect(workflowContent).toContain("repository-named Tracker Project");
    expect(workflowContent).toContain("Backlog, Ready, In Progress, In Review, and Done");
    expect(workflowContent).toContain("ready-for-agent");
    expect(workflowContent).toContain("`.firehorse/manifest.json`");
    expect(workflowContent).toContain("safeApply.defaultMode");
    expect(workflowContent).toContain("Missing GitHub Project automation");
    expect(workflowContent).toContain("record a setup gap");
    expect(workflowContent).toContain("`firehorse/setup` helpers");
    expect(workflowContent).toContain("do not turn session-start validation into a mutation path");
    expect(extractGeneratedProvenance(workflowContent)).toMatchObject({
      firehorseId: "new-project",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("projects build as a one-vertical-slice implementation workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/build.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/worker.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions, { knownUpstreamSkills });
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["feedback-loop", "verification-contract"],
      agentRoles: ["worker", "reviewer"],
      upstreamSkills: ["mattpocock-skills:tdd"],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/reviewer.md",
      "packages/firehorse-claude/agents/worker.md",
      "packages/firehorse-claude/commands/firehorse/build.md",
      "packages/firehorse-claude/commands/firehorse/horse-build.md",
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/reviewer.md",
      "packages/firehorse-pi/agents/worker.md",
      "packages/firehorse-pi/prompts/firehorse/build.md",
      "packages/firehorse-pi/prompts/firehorse/horse-build.md",
      "packages/firehorse-pi/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/build.md",
        "./packages/firehorse-pi/prompts/firehorse/horse-build.md",
      ],
      claudeCommands: ["./commands/firehorse/build.md", "./commands/firehorse/horse-build.md"],
      claudeAgents: ["./agents/reviewer.md", "./agents/worker.md"],
    });

    const workflow = generated.find((file) => file.definitionId === "build");
    const workflowContent = workflow?.content ?? "";
    expect(workflowContent).toContain("one issue-sized Vertical Slice");
    expect(workflowContent.toLowerCase()).toContain(
      "whole-prd builds require explicit user request",
    );
    expect(workflowContent).toContain("move only that scoped issue to In Progress using `gh`");
    expect(workflowContent).toContain("Canonical Agent Role reference: `worker`");
    expect(workflowContent).toContain("Canonical Agent Role reference: `reviewer`");
    expect(workflowContent).toContain("one-test-at-a-time TDD");
    expect(workflowContent).toContain("name the alternate feedback loop");
    expect(workflowContent).toContain("run a canonical `reviewer` gate");
    expect(workflowContent).toContain(
      "The parent workflow retains ownership of scope, TDD contract, implementation evidence, review gate, and completion.",
    );
    expect(extractGeneratedProvenance(workflowContent)).toMatchObject({
      firehorseId: "build",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("projects ship as a first-party release workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/ship.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions);
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["feedback-loop", "verification-contract"],
      agentRoles: ["reviewer"],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/reviewer.md",
      "packages/firehorse-claude/commands/firehorse/horse-ship.md",
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/horse-ship.md",
      "packages/firehorse-pi/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: ["./packages/firehorse-pi/prompts/firehorse/horse-ship.md"],
      claudeCommands: ["./commands/firehorse/horse-ship.md"],
      claudeAgents: ["./agents/reviewer.md"],
    });

    const workflow = generated.find((file) => file.definitionId === "ship");
    const workflowContent = workflow?.content ?? "";
    expect(workflowContent).toContain("changed files");
    expect(workflowContent).toContain("solved issues");
    expect(workflowContent).toContain("unrelated changes");
    expect(workflowContent).toContain("release scope");
    expect(workflowContent).toContain("Closes #...");
    expect(workflowContent).toContain("Refs #...");
    expect(workflowContent).toContain("canonical `reviewer` gate before merge");
    expect(workflowContent).toContain("Prefer squash merge");
    expect(workflowContent).toContain("Keep a Changelog-style notes");
    expect(workflowContent).toContain("version bump");
    expect(workflowContent).toContain("linked issues are closed and Done");
    expect(workflowContent).toContain("reporting or repairing automation gaps");
    expect(extractGeneratedProvenance(workflowContent)).toMatchObject({
      firehorseId: "ship",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("projects review-code as a no-patch-by-default code review workflow", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/review-code.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions);
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["verification-contract"],
      agentRoles: ["reviewer"],
    });

    const generated = projectDefinitions(definitions, { repoRoot });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/reviewer.md",
      "packages/firehorse-claude/commands/firehorse/horse-review-code.md",
      "packages/firehorse-claude/commands/firehorse/review.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/horse-review-code.md",
      "packages/firehorse-pi/prompts/firehorse/review.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/horse-review-code.md",
        "./packages/firehorse-pi/prompts/firehorse/review.md",
      ],
      claudeCommands: [
        "./commands/firehorse/horse-review-code.md",
        "./commands/firehorse/review.md",
      ],
      claudeAgents: ["./agents/reviewer.md"],
    });

    const workflow = generated.find((file) => file.definitionId === "review-code");
    const workflowContent = workflow?.content ?? "";
    expect(workflowContent).toContain("issue-scoped and holistic review inputs");
    expect(workflowContent).toContain("reviews without patching by default");
    expect(workflowContent).toContain(
      "correctness, Verification Contract coverage, architecture, maintainability, tests, docs, generated artifacts, and evidence",
    );
    expect(workflowContent).toContain(
      "blocking findings, non-blocking findings, evidence, and recommended next actions",
    );
    expect(extractGeneratedProvenance(workflowContent)).toMatchObject({
      firehorseId: "review-code",
      firehorseSourceSha256: workflow?.sourceHash,
    });
  });

  it("documents complete v1 examples for the accepted definition contract", async () => {
    const docs = await readFile(
      nodePath.join(
        repoRoot,
        "docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md",
      ),
      "utf8",
    );

    for (const relativePath of [
      "workflows/fix-bug.md",
      "skills/feedback-loop.md",
      "agents/reviewer.md",
    ]) {
      const source = await readFile(nodePath.join(definitionsRoot, relativePath), "utf8");
      expect(docs).toContain(source.trim());
    }
  });

  it("documents generated mirror maintenance and deferred runtime boundaries", async () => {
    const docs = await readFile(
      nodePath.join(
        repoRoot,
        "docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md",
      ),
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
      nodePath.join(definitionsRoot, "workflows/fix-bug.md"),
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
    const role = await parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md"));
    const workflow = parseDefinition({
      path: nodePath.join(definitionsRoot, "workflows/reference-fixture.md"),
      content: `---\nschemaVersion: 1\nid: reference-fixture\nkind: workflow\ntitle: Reference Fixture\ndescription: Reference validation fixture.\nsupportingSkills:\n  - id: reviewer\nagentRoles:\n  - id: feedback-loop\nupstreamSkills:\n  - upstream: unknown-upstream\n    id: diagnose\n---\n\n${bodyWithSections(workflowSections)}`,
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
      path: nodePath.join(definitionsRoot, "agents/reviewer.md"),
      content: `---\nschemaVersion: 1\nid: reviewer\nkind: agent-role\nname: other-reviewer\ntitle: Reviewer\ndescription: Agent role metadata validation fixture.\n---\n\n${bodyWithSections(agentRoleSections)}`,
    });

    expect(validateDefinitionSet([role])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "agent_role.name_id_mismatch" })]),
    );
  });

  it("projects fix-bug as the public bug-fix workflow without a diagnose-fix alias", async () => {
    const definitions = await Promise.all([
      parseDefinitionFile(nodePath.join(definitionsRoot, "workflows/fix-bug.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/feedback-loop.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "skills/verification-contract.md")),
      parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md")),
    ]);
    assertValidDefinitionSet(definitions, { knownUpstreamSkills });
    expectWorkflowReferences(definitions[0]!, {
      supportingSkills: ["feedback-loop", "verification-contract"],
      agentRoles: ["reviewer"],
      upstreamSkills: ["mattpocock-skills:diagnose"],
    });

    const generated = projectDefinitions(definitions, {
      repoRoot,
    });
    const generatedPaths = generated.map((file) => file.path);

    expect(generatedPaths).toEqual([
      "packages/firehorse-claude/agents/reviewer.md",
      "packages/firehorse-claude/commands/firehorse/fix.md",
      "packages/firehorse-claude/commands/firehorse/horse-fix-bug.md",
      "packages/firehorse-claude/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-claude/skills/firehorse/verification-contract/SKILL.md",
      "packages/firehorse-pi/agents/reviewer.md",
      "packages/firehorse-pi/prompts/firehorse/fix.md",
      "packages/firehorse-pi/prompts/firehorse/horse-fix-bug.md",
      "packages/firehorse-pi/skills/firehorse/feedback-loop/SKILL.md",
      "packages/firehorse-pi/skills/firehorse/verification-contract/SKILL.md",
    ]);
    expect(generatedPaths).not.toContain(
      "packages/firehorse-claude/commands/firehorse/horse-diagnose-fix.md",
    );
    expect(generatedPaths).not.toContain(
      "packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md",
    );

    expect(generated[0]?.content).not.toContain("Generated by Firehorse. DO NOT EDIT.");
    expect(generated[1]?.content).toContain("Generated by Firehorse. DO NOT EDIT.");
    expect(generated[1]?.content).toContain("argument-hint");
    expect(generated[2]?.content).toContain("firehorseSourceSha256");

    expect(generatedManifestEntries(generated)).toMatchObject({
      rootPiPrompts: [
        "./packages/firehorse-pi/prompts/firehorse/fix.md",
        "./packages/firehorse-pi/prompts/firehorse/horse-fix-bug.md",
      ],
      packagePiSkills: [
        "./skills/firehorse/feedback-loop",
        "./skills/firehorse/verification-contract",
      ],
      claudeCommands: ["./commands/firehorse/fix.md", "./commands/firehorse/horse-fix-bug.md"],
      claudeAgents: ["./agents/reviewer.md"],
    });

    expect(generatedPaths).not.toContain(
      "packages/firehorse-claude/agents/horse-diagnostic-reviewer.md",
    );
    expect(generatedPaths).not.toContain(
      "packages/firehorse-pi/agents/horse-diagnostic-reviewer.md",
    );
    expect(extractGeneratedProvenance(generated[0]?.content ?? "")).toMatchObject({
      firehorseGenerated: true,
      firehorseId: "reviewer",
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

  it("adapts reviewer role mirrors for Pi and Claude provider surfaces", async () => {
    const role = await parseDefinitionFile(nodePath.join(definitionsRoot, "agents/reviewer.md"));
    assertValidDefinitionSet([role]);

    const generated = projectDefinitions([role], { repoRoot });
    const claude = generated.find((file) => file.provider === "claude");
    const pi = generated.find((file) => file.provider === "pi");

    expect(claude?.path).toBe("packages/firehorse-claude/agents/reviewer.md");
    expect(claude?.content).toContain('name: "reviewer"');
    expect(claude?.content).toContain('tools: "Read, Grep, Glob, LS, Bash"');
    expect(claude?.content).toContain('effort: "high"');
    expect(claude?.content).not.toContain("systemPromptMode");
    expect(claude?.content).not.toContain("defaultReads");
    expect(claude?.content).toContain("## Mission");

    expect(pi?.path).toBe("packages/firehorse-pi/agents/reviewer.md");
    expect(pi?.content).toContain('name: "reviewer"');
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
