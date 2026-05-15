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
