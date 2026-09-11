---
schemaVersion: 1
id: fix-bug
kind: workflow
title: Fix Bug
description: Fix a bug by building a feedback loop, tracing the failing symbol's callers in the codebase graph before hypothesising, and reporting regression evidence from both sides of the fix.
argumentHint: "[bug description | issue URL or number | failing test | log excerpt]"
requires:
  tools:
    - mcp:codebase-memory-mcp
    - read
    - bash
    - edit
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - find
    - ls
    - write
  orchestration:
    - subagents
  environment:
    - github
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: diagnosing-bugs
  - upstream: mattpocock-skills
    id: tdd
---

# Fix Bug

## Purpose

Use this workflow to move from a bug report to a fix proven to have changed the behaviour. It adds two things to `diagnosing-bugs`:

- Before you hypothesise, the failing symbol's **call sites** come out of the codebase graph, so the hypothesis names a real one instead of a plausible one.
- The report carries **evidence from both sides**: the loop **red** on the old code, **green** on the new, both pasted.

`diagnosing-bugs` Phase 3 tells you to hypothesise. The graph trace is what stops that phase guessing which caller is implicated.

## Usage

Invoke the generated command with a bug description, an issue reference, a failing test name, or a log excerpt. `$ARGUMENTS` carries whatever you gave.

## Inputs

- `$ARGUMENTS`: the report or the evidence.
- The issue body and comments, when the report is a tracker issue.
- The codebase graph, through `codebase-memory-mcp`.
- `CONTEXT.md` for the repo's vocabulary, and the ADRs covering the area you are touching.

## Outputs

- The loop: the exact command or script that goes red on this bug.
- A call-site list for the failing symbol, with the query that produced it.
- The smallest patch that addresses the evidenced cause.
- A named regression test, with its path.
- A regression evidence block: the loop's output before the patch and after it.

## Supporting Capabilities

- `mattpocock-skills` / `diagnosing-bugs` supplies the six-phase discipline; `tdd` writes the regression test.
- `codebase-memory-mcp` is required: step 3 enumerates call sites from the graph, which is what stops a hypothesis naming a plausible caller instead of a real one. Absent, say so in the first line of the report and fall back to grep, knowing the call-site list is then incomplete.
- **Graph reference:** the `codebase-memory` skill carries the `search_graph` and `query_graph` syntax, the edge-type vocabulary, and the multi-hop examples. `codebase-memory-mcp` installs it, so it is present wherever the server is — invoke it when you need the query form rather than guessing one. This workflow says when to query, not how.

## Orchestration Intent

You run `diagnosing-bugs` phase by phase and insert the graph trace between Phase 2 and Phase 3. Nothing is delegated by default — the loop stays in the session reading its output. When the bug spans packages and the traces are large, run the trace as a subagent and bring back the call-site list alone.

## Safety Gates

- **A red loop precedes every edit.** No loop, no patch: produce a diagnosis instead, and say why the loop could not be built.
- **Every hypothesis names a call site** from step 3's list. One that cannot be attached to a call site is discarded.
- **One bug, one patch.** The patch addresses the evidenced cause and stops; a second bug is a second ticket.
- **Secrets stay out of every artifact.** Write `<REDACTED>` in place of a secret in any command, output, or captured artifact, and build loops against environment variables.
- **Before-and-after output proves the fix.** The claim without both sides of the loop is not a result.
- **The diagnosis lives in the tracker**, as a comment on the ticket, never a markdown draft committed beside the code.
- **Generated files come from their generator**, never an editor.

## Gotchas

- A loop that passes on the broken code is not a loop for this bug. Confirm it goes red before trusting anything it says afterwards.
- Instrumentation added in Phase 4 survives the patch unless Phase 6 removes it. A diff carrying leftover logging is a review finding, not a fix.
- A stale graph answers confidently. `index_status` behind HEAD means the call-site list describes an older tree — run `/firehorse:index`, or state the gap.

## Procedure

1. **Read the report.** Name the claimed failure, the expected behaviour, and the evidence you already have. A tracker issue is read with `gh issue view <number> --comments`.
   → Done when: claimed failure and expected behaviour are written down, separately.

2. **Build the loop.** `mattpocock-skills:diagnosing-bugs` Phase 1, spending disproportionate effort here, then Phase 2 to reproduce and minimise.
   → Done when: one command goes red on this bug, recorded verbatim with its output.

3. **Trace the call sites.** `search_graph` for the symbol the loop implicates, `trace_path` on each hit for its callers, `query_graph` when the path crosses more than one hop. Then `check_index_coverage` on every path you will cite and `index_status` for freshness.
   → Done when: the call-site list is written down and the index's freshness is recorded.

4. **Hypothesise.** Phase 3. Each hypothesis names one call site from step 3 and states what the loop would do if it held.
   → Done when: every surviving hypothesis is attached to a call site and carries a prediction.

5. **Instrument.** Phase 4, at the named call site, against the loop.
   → Done when: one hypothesis is confirmed or all are killed. All killed, return to step 4.

6. **Patch and test.** Phase 5: the smallest patch that addresses the confirmed cause, plus a regression test via `mattpocock-skills:tdd` at the seam the loop already reaches.
   → Done when: the loop goes green and the regression test has a path.

7. **Produce regression evidence.** The loop's red output from step 2, the same loop green now, and the regression test failing against the pre-patch code. Then the repo's own gate — the typecheck and test scripts its manifest declares, run through the package manager its lockfile names; no gate script, no gate.
   → Done when: all three outputs are captured and the gate is green.

8. **Clean up and commit.** Remove the step-5 instrumentation, then commit in small, reviewable commits.
   → Done when: the diff contains no instrumentation and the working tree is clean.

9. **Report on the issue.** Comment with the loop, the call-site list, the confirmed cause, the regression evidence, the test path, and anything you did not verify. Leave the issue open for `/firehorse:ship` to close.
   → Done when: the comment is posted and the issue is still open.

## Projection Notes

`diagnosing-bugs` and `tdd` are referenced rather than inlined, so their reference files load through Claude's own skill mechanism.
