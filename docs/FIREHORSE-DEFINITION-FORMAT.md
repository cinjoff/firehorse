# Firehorse Definition Format v1

Firehorse Definition Files are the canonical authoring source for Firehorse-authored workflows, reusable skills, and agent roles. They live in `packages/firehorse-core/definitions/` and project into checked-in Pi and Claude mirrors.

This format is declarative authoring metadata plus Markdown instructions. It is **not** a runtime, prompt loader, provider transport, slash-command implementation, hook, or autonomous execution engine.

## Layout

```text
packages/firehorse-core/definitions/
├── workflows/<id>.md
├── skills/<id>.md
└── agent-roles/<id>.md
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

Claude projections filter/adapt unsupported Pi-only fields. Pi projections create subagent-compatible sync artifacts under `packages/firehorse-pi/agents/firehorse/`; `firehorse-setup` is responsible for explicit sync because `pi-subagents` does not discover package agent directories.

## Generated mirrors and manifests

Run:

```sh
pnpm definitions:write
pnpm definitions:check
```

`definitions:write` parses canonical definitions, validates cross-definition references, regenerates provider mirrors, updates manifests, and removes stale generated mirrors only when they contain valid Firehorse provenance. It refuses to overwrite unprovenanced target files.

`definitions:check` is non-mutating. It fails when canonical definitions are invalid, generated files are missing/stale/manually edited, manifests are stale, or stale generated mirrors should be removed.

Generated mirrors include:

- Provider-native frontmatter.
- `firehorseGenerated: true`.
- `firehorseKind`, `firehorseId`, `firehorseSource`, `firehorseSourceSha256`, and `firehorseSchemaVersion`.
- A visible HTML `Generated by Firehorse. DO NOT EDIT.` comment.
- Fully rendered instructions with canonical headings preserved where possible.

Projection updates:

- Root `package.json` Pi manifest entries.
- `packages/firehorse-pi/package.json` Pi package manifest entries.
- `packages/firehorse-claude/.claude-plugin/plugin.json` command, skill, and agent entries.

## Complete v1 examples

The checked-in source files below are authoritative. They are repeated here so authors can see a complete v1 contract in one document. Because none of these first public IDs has been renamed or deprecated, the examples demonstrate alias/deprecation handling by leaving those optional fields absent rather than inventing false history.

### `diagnose-fix` workflow

```markdown
---
schemaVersion: 1
id: diagnose-fix
kind: workflow
title: Diagnose Fix
description: Diagnose a bug, establish a feedback loop, patch only when the scope is clear, and review the result before handoff.
argumentHint: "[bug description | issue URL | failing test | reproduction notes]"
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
agentRoles:
  - id: diagnostic-reviewer
upstreamSkills:
  - upstream: mattpocock-skills
    id: diagnose
---

# Diagnose Fix

## Purpose

Use this workflow to move from a bug report to a validated, scoped fix without guessing. It combines the upstream `mattpocock-skills` `diagnose` skill, the Firehorse-authored `feedback-loop` skill, and the `diagnostic-reviewer` agent role.

## Usage

Invoke the generated provider command as `horse-diagnose-fix` with a freeform bug description, GitHub issue URL, failing test name, log excerpt, or reproduction notes. In generated prompt templates and commands, the user's freeform input is available as `$ARGUMENTS`.

## Inputs

- `$ARGUMENTS`: the bug description or evidence supplied by the user.
- Repository files, tests, logs, and docs relevant to the failure.
- Existing project guidance from `AGENTS.md`, planning docs, and package manifests.

## Outputs

- A diagnosis summary with the suspected or proven root cause.
- The feedback loop used to reproduce and validate the issue.
- A scoped patch only when the regression loop and scope gate pass.
- Reviewer findings from the diagnostic reviewer role when delegation is available, or a reviewer checklist when it is not.
- A final handoff that states commands run, evidence observed, remaining risks, and blocked decisions.

## Supporting Capabilities

- Firehorse skill reference: `feedback-loop`.
- Upstream skill reference: `mattpocock-skills` / `diagnose`.
- Agent role reference: `diagnostic-reviewer`.
- Required capabilities: local file reading and shell validation.
- Optional capabilities: provider-native subagents, parallel review, GitHub context, and write tools for the scoped patch.

## Orchestration Intent

Prefer a parent-led flow: understand the report, establish evidence, patch only if safe, then review. If Pi or Claude subagents are available, use a worker for the scoped patch and a fresh `diagnostic-reviewer` for review. If delegation is unavailable, perform the same steps in a single agent session and make the missing delegation explicit in the handoff.

## Safety Gates

- Do not edit code before the bug scope is clear enough to name the affected behavior.
- Do not edit code before a feedback loop exists or the user explicitly approves a diagnosis-only path.
- Do not broaden the patch beyond the bug unless the user approves the expanded scope.
- Do not mark the workflow complete without reporting validation evidence or the reason validation could not run.
- Do not add a Firehorse runtime, prompt loader, provider transport, slash-command runtime, hook, or autonomous execution engine.

## Procedure

1. Read the user-supplied `$ARGUMENTS` and identify the claimed failure, expected behavior, and known evidence.
2. Apply the upstream `diagnose` skill's disciplined loop: reproduce, minimise, hypothesise, instrument, fix, and regression-test.
3. Use the `feedback-loop` skill to name the smallest repeatable validation path and capture the baseline result.
4. If the feedback loop is missing or the scope is unclear, stop and ask for clarification or produce a diagnosis report.
5. If the gate passes, make the smallest patch that addresses the evidenced root cause.
6. Rerun the feedback loop and any adjacent cheap checks.
7. Run or simulate the `diagnostic-reviewer` role. Address blockers that are clearly within scope; report anything requiring human judgment.
8. Finalize with issue-by-issue or bug-by-bug status, files changed, commands run, validation results, reviewer findings, and blocked follow-ups.

## Projection Notes

Workflow projections are static provider-native mirrors: Pi prompt templates and Claude commands named `horse-diagnose-fix`. They contain rendered instructions and structured references, but they do not create a runtime execution graph. Supporting bodies are referenced rather than inlined wholesale so the workflow remains readable and each provider can load skills or roles through its native mechanisms.
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

Load this skill when a workflow asks for a regression loop, reproduction loop, validation command, or before/after evidence. It is especially useful inside `diagnose-fix`, but it is intentionally reusable for build and review workflows.

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

### `diagnostic-reviewer` agent role

```markdown
---
schemaVersion: 1
id: diagnostic-reviewer
kind: agent-role
name: diagnostic-reviewer
title: Diagnostic Reviewer
description: Reviews bug-diagnosis and fix work for root-cause evidence, regression-loop quality, scoped changes, and honest validation.
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
    - review-gates
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

# Diagnostic Reviewer

## Mission

Verify that diagnosis and fix work is evidence-based, scoped, and safe. The role protects Firehorse workflows from speculative patches, missing regressions, and over-broad changes.

## Responsibilities

- Check that the reported bug or failure was reproduced or otherwise grounded in evidence.
- Check that the proposed or implemented fix addresses the identified root cause.
- Check that the feedback loop is specific enough to detect the regression in the future.
- Check that code changes stay within the approved bug scope.
- Report blockers and follow-ups with file paths, commands, or observed evidence.

## Inputs

- The original bug description or issue link.
- The diagnosis notes, reproduction steps, logs, or failing test.
- The diff or proposed patch when code was changed.
- Validation output from the feedback loop.

## Outputs

- A concise review with pass/fail findings.
- Blockers for missing reproduction, missing regression coverage, unproven root cause, or unsafe scope expansion.
- Suggested minimal corrective actions when the work can be salvaged safely.

## Tools

Use read-only inspection first. Run local validation commands only when the parent workflow or repository guidance allows them. Do not rely on provider-specific coordination tools being present; if blocked, report the exact decision needed.

## Authority

The diagnostic reviewer may reject a fix as unsafe when the feedback loop is missing, the root cause is speculative, or the patch changes unrelated behavior. It may recommend small follow-up edits, but it does not own the implementation plan.

## Escalation

Escalate to the parent agent or human when the bug scope is unclear, when validation requires credentials or external systems, when generated files appear hand-edited, or when a product decision is needed to choose between fixes.

## Collaboration

Work after a worker or parent diagnosis pass. If provider-native subagents are available, act as a fresh reviewer with only the relevant issue, diff, and validation evidence. If delegation is unavailable, the parent can use this role contract as a checklist.

## Boundaries

- Do not mutate code while acting in review-only mode.
- Do not accept a fix solely because tests pass if the test does not cover the reported failure.
- Do not require a Firehorse runtime, prompt loader, provider transport, or autonomous execution loop.
- Do not normalize upstream skill content into this role.

## Projection Notes

Claude projections become `horse-diagnostic-reviewer` agent files with unsupported Pi-only fields filtered. Pi projections become subagent-compatible sync artifacts that `firehorse-setup` can copy into the user's Pi agent directory because package agent directories are not discovered by `pi-subagents` at runtime.
```

## Deferred workflow boundaries

`horse-new-project` and `horse-map-codebase` are future consumers of this generator. They should be authored as canonical definitions later, then projected through the same write/check pipeline. They are intentionally not implemented as hand-authored provider-native workflows in this slice.

Still deferred:

- Firehorse runtime loading or execution.
- Prompt assembly beyond static generated mirrors.
- Provider API transports for Claude, Codex, or Pi.
- Slash-command or hook runtime behavior.
- Autonomous execution loops.
- Migration of broad `.pi/gsd/` content.
