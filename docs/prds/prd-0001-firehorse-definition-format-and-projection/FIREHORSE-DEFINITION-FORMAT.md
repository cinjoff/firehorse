# Firehorse Definition Format v1

> **Placement/status:** This is the detailed v1 contract appendix from PRD-0001. It moved from root `docs/` into this Planning Workspace so root docs stay focused on durable current guidance. For the current architecture summary, read `docs/ARCHITECTURE.md`; for actual public surfaces, read `packages/firehorse-core/definitions/` and regenerated mirrors.

Firehorse Definition Files are the canonical authoring source for Firehorse-authored workflows, reusable skills, and agent roles. They live in `packages/firehorse-core/definitions/` and project into checked-in Pi and Claude mirrors.

This format is declarative authoring metadata plus Markdown instructions. It is **not** a runtime, prompt loader, provider transport, slash-command implementation, hook, or autonomous execution engine.

## Layout

```text
packages/firehorse-core/definitions/
├── workflows/<id>.md
├── skills/<id>.md
└── agents/<id>.md
```

The `id`, `kind`, and path must agree. IDs are globally unique across all three definition kinds and are stable public API. Renames require `aliases`, `deprecated`, and `replacedBy` metadata rather than silent ID changes. The initial examples are new, non-deprecated definitions, so they intentionally omit alias/deprecation fields; those fields belong only when a definition has actually been renamed or deprecated.

## Common frontmatter

All v1 definitions use this common field set:

| Field           | Type     | Notes                                                        |
| --------------- | -------- | ------------------------------------------------------------ |
| `schemaVersion` | integer  | Required, currently `1`.                                     |
| `id`            | slug     | Lowercase letters, numbers, single hyphens; globally unique. |
| `kind`          | enum     | `workflow`, `skill`, or `agent-role`.                        |
| `title`         | string   | Human-readable title.                                        |
| `description`   | string   | Provider-facing summary.                                     |
| `requires`      | object   | Provider-neutral required capabilities.                      |
| `optional`      | object   | Provider-neutral optional capabilities.                      |
| `aliases`       | string[] | Optional historical IDs.                                     |
| `deprecated`    | boolean  | Optional deprecation marker.                                 |
| `replacedBy`    | string   | Optional replacement ID; requires `deprecated: true`.        |

Capability objects may contain `tools`, `orchestration`, `modalities`, and `environment` arrays. Common values include tools such as `read`, `bash`, `edit`, `write`; orchestration values such as `subagents`, `parallel-agents`, `review-gates`; modalities such as `text`, `vision`; and environment values such as `filesystem`, `git`, `github`, `node`, and `pnpm`. Extension-prefixed values such as `mcp:github` are valid.

## Workflow definitions

Additional workflow frontmatter:

| Field              | Type                 | Notes                                                  |
| ------------------ | -------------------- | ------------------------------------------------------ |
| `argumentHint`     | string               | Projected to Pi prompt-template and Claude command UX. |
| `supportingSkills` | `{ id }[]`           | Firehorse-authored skill references.                   |
| `agentRoles`       | `{ id }[]`           | Firehorse-authored agent role references.              |
| `upstreamSkills`   | `{ upstream, id }[]` | Structured upstream skill references.                  |

Required body sections:

1. `## Purpose`
2. `## Usage`
3. `## Inputs`
4. `## Outputs`
5. `## Supporting Capabilities`
6. `## Orchestration Intent`
7. `## Safety Gates`
8. `## Procedure`
9. `## Projection Notes`

Workflow projections generate Pi prompt templates and Claude commands named `horse-<id>`.

## Skill definitions

Additional skill frontmatter:

| Field           | Type   | Notes                           |
| --------------- | ------ | ------------------------------- |
| `license`       | string | Optional Agent Skills metadata. |
| `compatibility` | string | Optional Agent Skills metadata. |

Required body sections:

1. `## Purpose`
2. `## Usage`
3. `## Inputs`
4. `## Outputs`
5. `## Instructions`
6. `## Boundaries`
7. `## Examples`
8. `## Projection Notes`

Firehorse-authored skill projections generate Pi and Claude `SKILL.md` mirrors under provider-native `skills/firehorse/<id>/` folders. Imported upstream skills are not normalized into this strict template; they stay upstream-shaped curated ingredients.

## Agent-role definitions

Agent-role frontmatter uses the documented `pi-subagents` agent field set as its canonical basis, plus Firehorse identity fields. Supported fields include `name`, `package`, `tools`, `extensions`, `model`, `fallbackModels`, `thinking`, `systemPromptMode`, `inheritProjectContext`, `inheritSkills`, `defaultContext`, `skills`, `output`, `defaultReads`, `defaultProgress`, `interactive`, and `maxSubagentDepth`.

Required body sections:

1. `## Mission`
2. `## Responsibilities`
3. `## Inputs`
4. `## Outputs`
5. `## Tools`
6. `## Authority`
7. `## Escalation`
8. `## Collaboration`
9. `## Boundaries`
10. `## Projection Notes`

Agent-role projections generate top-level provider-native agent files: Claude under `packages/firehorse-claude/agents/<id>.md` and Pi sync artifacts under `packages/firehorse-pi/agents/<id>.md`. `firehorse-setup` is responsible for explicit Pi sync because `pi-subagents` does not discover package agent directories. Agent-role projections use provider-native names directly, such as `reviewer.md` and `plan-reviewer.md`, while workflow and skill generated mirrors continue using Firehorse `horse-*` names.

## Generated mirrors and manifests

Run:

```sh
pnpm definitions:write
pnpm definitions:check
```

`definitions:write` parses canonical definitions, validates cross-definition references, regenerates provider mirrors, updates manifests, and removes stale generated mirrors only when they contain valid Firehorse provenance. Workflow and skill targets refuse unprovenanced overwrites. Agent Role targets are owned top-level provider-native projections, so write mode may overwrite them; check mode reports unprovenanced Agent Role targets as stale.

`definitions:check` is non-mutating. It fails when canonical definitions are invalid, generated files are missing/stale/manually edited, manifests are stale, or stale generated mirrors should be removed.

Generated mirrors include:

- Provider-native frontmatter.
- `firehorseGenerated: true`.
- `firehorseKind`, `firehorseId`, `firehorseSource`, `firehorseSourceSha256`, and `firehorseSchemaVersion`.
- A visible HTML `Generated by Firehorse. DO NOT EDIT.` comment for workflow and skill mirrors.
- Frontmatter-only provenance for Agent Role mirrors, so generated metadata does not materially affect the agent's working instructions.
- Fully rendered instructions with canonical headings preserved where possible.

Projection updates:

- Root `package.json` Pi manifest entries.
- `packages/firehorse-pi/package.json` Pi package manifest entries.
- `packages/firehorse-claude/.claude-plugin/plugin.json` command, skill, and agent entries.

## Complete v1 examples

The checked-in source files below are authoritative. They are repeated here so authors can see a complete v1 contract in one document. Because none of these first public IDs has been renamed or deprecated, the examples demonstrate canonical ID alias/deprecation handling by leaving those optional fields absent rather than inventing false history. Provider-native compatibility names use `nativeAliases` instead.

### `fix-bug` workflow

```markdown
---
schemaVersion: 1
id: fix-bug
kind: workflow
title: Fix Bug
description: Fix a bug root-cause-first by establishing reproduction or regression coverage, mutating only within scope, and recording validation evidence.
argumentHint: "[bug description | issue URL | failing test | reproduction notes]"
nativeAliases:
  - fix
requires:
  tools:
    - read
    - bash
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - find
    - ls
    - edit
    - write
  orchestration:
    - subagents
    - parallel-agents
    - review-gates
  environment:
    - github
    - pnpm
supportingSkills:
  - id: feedback-loop
  - id: verification-contract
agentRoles:
  - id: reviewer
upstreamSkills:
  - upstream: mattpocock-skills
    id: diagnose
---

# Fix Bug

## Purpose

Use this workflow to move from a bug report to a validated, scoped fix without guessing. It combines the upstream `mattpocock-skills` `diagnose` skill, the Firehorse-authored `feedback-loop` and `verification-contract` skills, and the `reviewer` agent role.

## Usage

Invoke the generated provider command as `horse-fix-bug` with a freeform bug description, GitHub issue URL, failing test name, log excerpt, or reproduction notes. In generated prompt templates and commands, the user's freeform input is available as `$ARGUMENTS`.

## Inputs

- `$ARGUMENTS`: the bug description or evidence supplied by the user.
- Repository files, tests, logs, and docs relevant to the failure.
- Existing project guidance from `AGENTS.md`, planning docs, issue tracker context, and package manifests.
- Any Verification Contract from the related PRD, issue, bug workspace, or review artifact.

## Outputs

- A diagnosis summary with the suspected or proven root cause.
- The feedback loop used to reproduce and validate the issue, including baseline and after-change evidence.
- A scoped patch only when the reproduction or regression loop and scope gate pass.
- Verification Contract notes showing expected behavior, required artifacts, acceptance checks, and dependencies affected by the bug.
- A lightweight local bug workspace for non-trivial bugs, preserving the report, reproduction evidence, hypotheses, patch notes, and validation results.
- Reviewer findings from the reviewer role when delegation is available, or a reviewer checklist when it is not.
- A final handoff that states files changed, commands run, validation results, remaining risks, and blocked decisions.

## Supporting Capabilities

- Firehorse skill reference: `feedback-loop` for the reproduction, regression, and before/after validation loop.
- Firehorse skill reference: `verification-contract` for tying the fix back to expected behavior, required artifacts, acceptance checks, and dependencies.
- Upstream skill reference: `mattpocock-skills` / `diagnose` for the disciplined reproduce, minimise, hypothesise, instrument, fix, and regression-test loop.
- Agent role reference: `reviewer`.
- Required capabilities: local file reading, git inspection, and shell validation.
- Optional capabilities: provider-native subagents, parallel review, GitHub context, and write tools for the scoped patch.

## Orchestration Intent

Prefer a parent-led, root-cause-first flow: understand the report, establish evidence, patch only if safe, then review. If Pi or Claude subagents are available, use a worker for a bounded scoped patch and a fresh `reviewer` for review. If delegation is unavailable, perform the same steps in a single agent session and make the missing delegation explicit in the handoff.

## Safety Gates

- Do not edit code before the bug scope is clear enough to name the affected behavior.
- Do not edit code before a reproduction or regression feedback loop exists, unless the user explicitly approves a diagnosis-only or exploratory path.
- Do not broaden the patch beyond the bug unless the user approves the expanded scope.
- Do not mark the workflow complete without reporting validation evidence or the reason validation could not run.
- Do not preserve or create a generated `horse-diagnose-fix` alias for this workflow.
- Do not skip a lightweight bug workspace for non-trivial bugs that need durable reproduction notes, hypotheses, patch notes, or validation evidence.
- Do not add a Firehorse runtime, prompt loader, provider transport, slash-command runtime, hook, or autonomous execution engine.

## Procedure

1. Read the user-supplied `$ARGUMENTS` and identify the claimed failure, expected behavior, known evidence, and relevant Verification Contract if one exists.
2. Apply the upstream `diagnose` skill's disciplined loop: reproduce, minimise, hypothesise, instrument, fix, and regression-test.
3. For non-trivial bugs, create or reuse a lightweight local bug workspace before mutation so reproduction notes, hypotheses, patch notes, and validation evidence survive handoff.
4. Use the `feedback-loop` skill to name the smallest repeatable validation path and capture the baseline result.
5. Use the `verification-contract` skill to connect the bug to expected behavior, required artifacts, acceptance checks, and dependencies.
6. If the feedback loop is missing or the scope is unclear, stop and ask for clarification or produce a diagnosis report.
7. If the gate passes, make the smallest patch that addresses the evidenced root cause.
8. Rerun the feedback loop and any adjacent cheap checks.
9. Run or simulate the `reviewer` role. Address blockers that are clearly within scope; report anything requiring human judgment.
10. Finalize with issue-by-issue or bug-by-bug status, bug workspace path when one exists, files changed, commands run, validation results, reviewer findings, and blocked follow-ups.

## Projection Notes

Workflow projections are static provider-native mirrors: Pi prompt templates and Claude commands named `horse-fix-bug`. They contain rendered instructions and structured references, but they do not create a runtime execution graph. Supporting bodies are referenced rather than inlined wholesale so the workflow remains readable and each provider can load skills or roles through its native mechanisms.
```

### `feedback-loop` skill

```markdown
---
schemaVersion: 1
id: feedback-loop
kind: skill
title: Feedback Loop
description: Establishes a small, repeatable evidence loop before and after code changes. Use when diagnosis, fixing, or review work needs reproduction, validation, and regression confidence.
requires:
  tools:
    - read
    - bash
  environment:
    - filesystem
    - git
optional:
  tools:
    - edit
    - write
    - grep
    - find
    - ls
  environment:
    - pnpm
license: MIT
compatibility: Works in static Firehorse projections; does not require a Firehorse runtime.
---

# Feedback Loop

## Purpose

Use this skill to turn vague confidence into an explicit feedback loop. A loop has observable input, a repeatable command or check, an expected failure or baseline, and a post-change validation result.

## Usage

Load this skill when a workflow asks for a regression loop, reproduction loop, validation command, or before/after evidence. It is especially useful inside `fix-bug`, but it is intentionally reusable for build and review workflows.

## Inputs

- A bug report, failing behavior, plan, or change request.
- The smallest known command, test, script, or manual check that demonstrates the current behavior.
- Any constraints on what may be changed.

## Outputs

- A named feedback loop with setup, command or manual check, expected signal, and success criteria.
- Captured before/after evidence.
- A recommendation to stop, ask for clarification, or patch only when the loop is reliable enough.

## Instructions

1. Identify the smallest observable behavior that matters.
2. Prefer an existing automated test or command. If none exists, design the smallest safe reproduction or manual check.
3. Run or describe the baseline before changing code. Record the exact command and observed signal.
4. If the signal is unrelated, flaky, or too broad, narrow it before patching.
5. After a change, run the same loop again and compare against the baseline.
6. Keep the loop in the final handoff: command, before result, after result, and any remaining risk.

## Boundaries

- Do not invent a passing result. If a command cannot run, report why and what evidence is missing.
- Do not broaden the fix just to make the loop pass.
- Do not add a runtime, prompt loader, provider transport, or autonomous execution behavior.
- If no reliable feedback loop exists and code mutation would be speculative, ask for approval or produce a diagnosis report instead.

## Examples

- For a failing unit test: run the specific test first, patch the scoped cause, then rerun the same test and any adjacent suite.
- For a UI bug without tests: reproduce with the smallest manual/browser path, capture the expected and observed behavior, then add or propose a regression test when feasible.
- For a docs-only report: validate by checking generated output, links, or examples instead of pretending there is code coverage.

## Projection Notes

Generated provider skill mirrors keep this instruction body intact and add only provider-native frontmatter plus Firehorse provenance. The generated skill remains a reusable instruction ingredient; it is not a runnable command and does not execute a workflow by itself.
```

### `reviewer` agent role

```markdown
---
schemaVersion: 1
id: reviewer
kind: agent-role
name: reviewer
title: Reviewer
description: Reviews diffs, bug fixes, Pull Requests, release artifacts, issue-sized changes, and holistic workstreams for correctness, root-cause evidence, Verification Contract coverage, architecture, maintainability, tests, docs, generated artifacts, and evidence.
requires:
  tools:
    - read
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - find
    - ls
    - bash
  orchestration:
    - subagents
    - parallel-agents
    - review-gates
  environment:
    - github
    - pnpm
tools:
  - read
  - grep
  - find
  - ls
  - bash
thinking: high
systemPromptMode: replace
inheritProjectContext: true
inheritSkills: false
defaultReads:
  - progress.md
defaultProgress: false
maxSubagentDepth: 0
---

# Reviewer

## Mission

Review a diff, bug fix, Pull Request, release artifact, issue-sized change, or holistic workstream against its Verification Contract and project quality gates without patching by default. The role protects Firehorse workflows from speculative patches, correctness regressions, missing evidence, weak tests, stale generated artifacts, and architecture drift.

## Responsibilities

- Correctness focus: check that the change implements the requested behavior and does not introduce obvious regressions.
- Root-cause focus: for bug fixes, check that the reported failure was reproduced or otherwise grounded in evidence and that the patch addresses the identified cause.
- Verification Contract focus: map expected behaviors, required artifacts, acceptance checks, and dependencies to the submitted evidence.
- Architecture focus: check provider boundaries, generated-file provenance, Definition Format constraints, and no-runtime scope limits.
- Maintainability focus: identify unnecessary complexity, naming drift, shallow modules, or changes that make future work harder.
- Tests and evidence focus: check that validation is targeted, repeatable, appropriate for the risk of the change, and honestly reports skipped checks.
- Docs and generated-artifact focus: check that user-facing or maintainer-facing docs changed when exposed behavior changed, and that generated mirrors were regenerated from canonical sources.
- Review-output focus: separate blocking findings, non-blocking findings, optional improvements, evidence, and recommended next actions.

## Inputs

- The diff, branch, Pull Request, release artifact, bug fix, issue-sized change, or holistic workstream under review.
- The original ask, issue, PRD, Planning Workspace, or Verification Contract.
- Validation output, generated mirror diffs, test logs, and implementation notes.
- Relevant project guidance such as `AGENTS.md`, domain docs, decisions, architecture docs, and package manifests.

## Outputs

- A review report with blocking findings, non-blocking findings, evidence, and recommended next actions.
- Findings grouped by requested focus when the parent workflow asks for a specific focus.
- File paths, commands, or artifact references that make each finding reproducible.
- A clear no-patch recommendation unless the user explicitly asks the workflow to mutate code.

## Tools

Use read-only inspection first. Run local validation commands only when the parent workflow or repository guidance allows them and when they are proportionate to the review scope. Prefer targeted tests and generated-file checks over broad, noisy commands. If provider-native subagents are unavailable, perform each requested review focus directly from this role contract.

## Authority

The reviewer may block completion when the change fails the Verification Contract, lacks root-cause evidence for a bug fix, lacks evidence for important behavior, mutates generated or provider-specific files incorrectly, violates architecture decisions, or leaves high-risk tests unrun without explanation. It may recommend patches or follow-up issues, but mutation requires explicit user or parent-workflow direction.

## Escalation

Escalate to the parent agent or human when the review scope is unclear, when a product decision is needed, when validation requires unavailable credentials or external systems, when the diff contains unrelated work, or when generated files appear hand-edited rather than regenerated from canonical definitions.

## Collaboration

Work after a builder, fixer, shipper, or parent workflow has produced a candidate diff and evidence. Separate review focuses may run in parallel when provider-native subagents are available. For holistic workstreams, summarize shared blockers once instead of duplicating the same finding across focuses.

## Boundaries

- Do not patch by default; review workflows are no-fix unless the user explicitly requests mutation.
- Do not approve changes solely because tests pass if the tests do not cover the Verification Contract.
- Do not require a Firehorse runtime, prompt loader, provider transport, or autonomous execution loop.
- Do not normalize upstream skill content into this role or make provider choreography canonical.
- Do not subsume `plan-reviewer`; PRD/product/execution plan review keeps its separate role contract for now.

## Projection Notes

Claude projections become `reviewer` agent files with unsupported Pi-only fields filtered. Pi projections become subagent-compatible sync artifacts named `reviewer` that `firehorse-setup` can copy into the user's Pi agent directory because package agent directories are not discovered by `pi-subagents` at runtime. Retired code-specific reviewer names are not preserved as compatibility aliases.
```

## Deferred workflow boundaries

PRD-0001 originally deferred both `horse-new-project` and `horse-map-codebase` until the generator existed. Current repo state has since moved on:

- `new-project` is now a canonical Workflow definition and generated `horse-new-project` provider surface.
- `map-codebase` / `horse-map-codebase` is still not a checked-in canonical definition or generated provider surface. Future codebase-mapping work should use the same definition/projection pipeline rather than hand-authored provider-native files.

Still deferred:

- Firehorse runtime loading or execution.
- Prompt assembly beyond static generated mirrors.
- Provider API transports for Claude, Codex, or Pi.
- Slash-command or hook runtime behavior beyond provider-owned setup/update hooks explicitly scoped by later PRDs.
- Autonomous execution loops.
- Migration of broad `.pi/gsd/` content.
