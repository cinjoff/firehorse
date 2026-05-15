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
