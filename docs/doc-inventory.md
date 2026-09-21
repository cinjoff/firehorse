# Doc inventory

Every markdown file in this repo outside `docs/agents/`, with what it answers,
whether that is still true, what links to it, and what else covers the same
ground. Produced for the inventory ticket on the docs map.

**Taken:** 2026-09-20, at commit `90d6adb`.

This decides nothing. It is the data the grilling that names the target
structure runs on, and it should be deleted once that structure is settled.

## Method

Every status below comes from opening the file, not from its name. Claims were
checked against the repo: whether a referenced path exists, whether a named
package is in `packages/`, whether a command is in the shipped set. Inbound
counts cover the working tree and tracker issue bodies separately, because a
file cited only by a closed ticket is in a different position from one loaded
by `CLAUDE.md` on every session.

`docs/agents/` is excluded, per the ticket. `docs/research/` is excluded too:
it is untracked one-off research from a later session and predates no decision.

## Root

| File | Lines | Answers | Status | Inbound | Overlap |
|---|---:|---|---|---|---|
| `AGENTS.md` | 125 | What any LLM CLI must know before touching this repo: packages, hard rules, layout, commands | Current | repo 11, issues 9 | Package list also in `CLAUDE.md` and `ARCHITECTURE.md` |
| `CLAUDE.md` | 82 | The Claude-specific deltas from `AGENTS.md` | Stale in part | repo 9, issues 17 | Same package list, third copy |
| `CONTEXT.md` | 172 | The repo's vocabulary, and what not to call each thing | Stale in part | repo 23, issues 19 | Only glossary, no overlap |
| `README.md` | 415 | What Firehorse is for a new user, and how to install it | Current | repo 12, issues 4 | "How it fits together" restates `ARCHITECTURE.md` |
| `CHANGELOG.md` | 358 | What changed in each release | Current | repo 6, issues 2 | None |

## docs/

| File | Lines | Answers | Status | Inbound | Overlap |
|---|---:|---|---|---|---|
| `ARCHITECTURE.md` | 214 | How a definition becomes a command, and why the boundaries sit where they do | Current | repo 19, issues 8 | Memory section vs `MEMORY.md`; upstream section vs `UPSTREAM-SKILLS.md` |
| `DECISIONS.md` | 3604 | Every binding project-wide decision, D-01 to D-187 | Current by construction | repo 25, issues 51 | None. Largest tracked file in the repo |
| `FIREHORSE-DEFINITION-FORMAT.md` | 228 | The authoring contract for a definition file | Current | repo 10, issues 4 | Frontmatter fields duplicate `types.ts`, which is the source of truth |
| `MEMORY.md` | 361 | How claude-mem is configured here, what leaves the machine, and how to query it | Current | repo 7, issues 1 | Short version in `ARCHITECTURE.md` |
| `MIGRATION-PLAN.md` | 269 | How Firehorse moved from cross-provider distribution to a Claude-only spine | Current as history | repo 5, issues 5 | Decisions section duplicates promoted entries in `DECISIONS.md` |
| `PROJECT.md` | 117 | Vision, audience, scope, constraints | **Stale throughout on positioning** | repo 12, issues 6 | Vision overlaps `README.md`; scope overlaps `ARCHITECTURE.md` |
| `UPSTREAM-SKILLS.md` | 198 | How a workflow names an upstream skill, and how drift is caught | Current | repo 2, issues 6 | Upstream section of `ARCHITECTURE.md` |
| `matt-pocock-workflow.md` | 144 | Which upstream skill to reach for, in what order | Stale in part | repo 0, issues 3 | Byte-identical copy in `prd-0002/context/` |
| `WORKFLOW-MAP.md` | 334 | Groups bundled skills by what a user is trying to do | **Stale throughout** | repo 3, issues 2 | Near-copy in `prd-0001/context/`, 340 lines |
| `SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md` | 542 | What the 14 May design conversation concluded | Current as history | repo 0, issues 4 | Near-copy in `prd-0001/context/`, same length, different content |
| `pstack-workflow.md` | 130 | What pstack is, and which parts are worth taking | Current research | repo 3, issues 3 | Base note the other three extend |
| `pstack-portability.md` | 345 | What pstack needs that Claude Code does not provide, and what each gap costs | Current research | repo 0, issues 0 | Extends `pstack-workflow.md` |
| `pstack-justifications.md` | 558 | Which of pstack's claims carry evidence and which are assertion | Current research | repo 0, issues 1 | Extends `pstack-workflow.md` |
| `verification-harnesses.md` | 565 | Harness recipes per surface, generator prior art, agent-facing CLI contracts | Current research | repo 1, issues 1 | Extends `pstack-workflow.md` |

## Stale claims, with the evidence

`PROJECT.md` is the only file stale in its premise rather than its details.
Line 8 says Firehorse projects into "Pi.dev and Claude Code", line 38 lists
"Claude, Pi.dev, Codex" as first-class, and line 53 tables
`packages/firehorse-pi`. That package does not exist; `packages/` holds
`firehorse-core` and `firehorse-claude`, the two that are left after D-186
retired the graph app. It carries 12 inbound repo references including
`CLAUDE.md`, `AGENTS.md`, and `CONTEXT.md`, so it cannot be deleted without
rehoming what reads it.

`WORKFLOW-MAP.md` names its own inputs at line 8 as "SKILL.md files bundled in
`firehorse-pi` / mirrored into `firehorse-claude`". Both the package and the
bundling model are gone: D-156 made Firehorse depend on upstream plugins and
vendor nothing. Its "recommended composite skills" section proposes
`firehorse-build-slice`, which was never built.

`matt-pocock-workflow.md` line 3 points at
`packages/firehorse-core/upstreams/mattpocock-skills/`, a directory that no
longer exists under D-156. The operating guidance in the body may still hold;
only its stated source is dead.

`CONTEXT.md` line 3 calls Firehorse "a cross-provider agent workflow framework",
which is the positioning the README rewrite retired.

`MIGRATION-PLAN.md` line 221 instructs "Delete `docs/prds/` and `docs/issues/`".
D-169 reversed the first half and kept the PRDs. The second half is now done.
The file declares itself historical at line 6, so this is a record of what was
planned rather than a live instruction, but a reader who skips the preamble
would be misled.

## PRD workspaces

Treated at workspace granularity, as the ticket asks. All six are internally
consistent: each states its own status in its `PRD.md` header.

| Workspace | Files | Lines | Status line in `PRD.md` | Parked as |
|---|---:|---:|---|---|
| `prd-0001-firehorse-definition-format-and-projection` | 12 | 1687 | Published / historical | issue #2, implemented |
| `prd-0002-firehorse-planning-review-workflows` | 11 | 943 | Published | #61, Verification Contract |
| `prd-0003-codebase-health-workflow` | 5 | 376 | Draft | #57, codebase health report |
| `prd-0004-build-to-ship-workflow-and-canonical-agents` | 8 | 417 | Published | #60, issue-to-release |
| `prd-0005-session-audit-and-agent-tooling-efficiency` | 14 | 1734 | Draft, local review ready | #58, session auditing |
| `prd-0006-firehorse-pi-claude-mem-wrapper` | 10 | 564 | Draft, implementation issues published | #59, progressive recall |

`prd-0006` is named for a package that no longer exists, and its wrapper target
was retired with the Pi distribution. Its parked concept, progressive
disclosure for memory recall, outlived it.

## Where the duplication actually is

Three kinds, and they are not equally worth fixing.

**The same file in two places.** `matt-pocock-workflow.md` is byte-identical to
`prd-0002/context/MATT_POCOCK_WORKFLOW.md`. `WORKFLOW-MAP.md` is 334 lines
against the 340-line copy in `prd-0001/context/`.
`SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md` and its `prd-0001/context/` copy are
both 542 lines but differ in content, so someone edited one side and the copies
have diverged silently. That last one is the only case where picking a winner
requires reading a diff rather than deleting a duplicate.

**The same facts restated in prose.** The three-package list appears in
`AGENTS.md`, `CLAUDE.md`, and `ARCHITECTURE.md`. Memory is explained in both
`ARCHITECTURE.md` and `MEMORY.md`, upstream skills in both `ARCHITECTURE.md` and
`UPSTREAM-SKILLS.md`, positioning in both `README.md` and `PROJECT.md`. Each is
cheap on its own and collectively they are why a wrong fact survives in one file
after being fixed in another.

**A note that extends another note.** The three pstack research notes and
`verification-harnesses.md` all build on `pstack-workflow.md` and say so in
their opening lines. This is layering rather than duplication, and it reads
correctly as long as the base note survives.

## Files nothing points at

`pstack-portability.md` (345 lines) has no inbound link in the working tree and
no literal citation in any issue body. It is the deliverable of closed ticket
#138, which is how it came to exist, but nothing routes a reader to it.
`pstack-justifications.md` is in the same position with one issue citation.
`matt-pocock-workflow.md` has no inbound repo reference at all, and
`SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md` lost its last one in commit `90d6adb`:
the session handoff deleted there was the only file that linked to it.

`MEMORY.md` was the opposite case worth noting: no issue had ever cited it, while
`AGENTS.md`, `CLAUDE.md`, `README.md`, and `ARCHITECTURE.md` all routed to it, so
it was load-bearing despite tracker silence. Ticket #290 rewrote it for
claude-mem and added `GUIDE.md` to that list.

## What this file is

An artifact added to the doc set it inventories, which is the problem it exists
to help solve. It is a snapshot, not a maintained document, and the right
outcome is that the structure decision consumes it and deletes it.
