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
