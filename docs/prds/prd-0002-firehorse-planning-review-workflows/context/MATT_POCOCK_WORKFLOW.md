# Matt Pocock Skills Workflow

This document synthesizes the two requested videos with the vendored Matt Pocock skills in `packages/firehorse-core/upstreams/mattpocock-skills/`. It is intended as high-level operating guidance: which skill to reach for, in what order, and what durable artifacts should be left behind.

## Source note

Firecrawl was used to scrape the YouTube pages and metadata. The first video, **“Full Walkthrough: Workflow for AI Coding — Matt Pocock”**, is described as a hands-on workshop covering the full lifecycle of AI-assisted development: turning ambiguous requirements into agent-ready plans, then running autonomous coding agents that ship production features. The second video, **“I stopped using /grill-me for coding. Here’s what I use instead:”**, introduces `/grill-with-docs` as the repo-aware evolution of `/grill-me`, with chapters on where `/grill-me` fails, ubiquitous language, `/grill-with-docs`, ADRs, demo, benefits, and whether `/grill-me` is dead.

The full transcript body was not exposed by the Firecrawl-accessible caption endpoints; this guide is therefore grounded in the scraped video metadata/chapters plus the local upstream skill definitions.

## Core idea

Treat AI coding as a pipeline from **ambiguity** to **durable context** to **agent-ready work** to **feedback-loop-driven implementation**.

The mistake is to jump straight from a vague request into autonomous coding. Pocock’s workflow pushes the agent to first establish shared language, document decisions, slice work into thin vertical issues, then implement only when there is enough context and a pass/fail loop.

## The durable-context loop

The skills work best when each step leaves behind a durable artifact that the next step can consume:

1. **Understand the repo** → `zoom-out`, `setup-matt-pocock-skills`
2. **Clarify the domain and decisions** → `grill-with-docs`, `CONTEXT.md`, ADRs
3. **Shape the product work** → `to-prd`
4. **Slice it into agent-ready work** → `to-issues`, `triage`
5. **Implement with a feedback loop** → `tdd` for features, `diagnose` for bugs
6. **Improve the codebase when friction appears** → `improve-codebase-architecture`
7. **Preserve continuity** → `handoff`

The key pattern is: do not rely on conversation memory when you can write the decision into a PRD, issue, `CONTEXT.md`, ADR, test, or handoff.

## `/grill-me` vs `/grill-with-docs`

Use `/grill-me` for general plan interrogation when no repo/domain documentation needs to be updated. It interviews the user one question at a time until the decision tree is resolved.

Use `/grill-with-docs` for coding work. It does everything `/grill-me` does, but grounds the conversation in the existing domain model and updates documentation as decisions crystallize:

- Read `CONTEXT.md` / `CONTEXT-MAP.md` before grilling.
- Challenge fuzzy terms against the project glossary.
- Resolve ambiguous words into a ubiquitous language.
- Update `CONTEXT.md` inline when new domain terms or relationships become clear.
- Offer ADRs only for decisions that are hard to reverse, surprising without context, or real trade-offs.

The point is not “better questions.” The point is **persistent shared language**. Future agents should not have to rediscover what this session already learned.

## Recommended workflows

### 1. First use in a repo

Run `setup-matt-pocock-skills` before serious use. It records:

- where the issue tracker lives,
- how triage labels map to canonical roles,
- whether the repo uses a single `CONTEXT.md` or multiple contexts via `CONTEXT-MAP.md`,
- where ADRs live.

Without this setup, `to-prd`, `to-issues`, `triage`, `tdd`, `diagnose`, and architecture skills will lack the project conventions they expect.

### 2. New feature from a vague idea

Use this sequence:

1. `zoom-out` if the agent does not understand the relevant area.
2. `grill-with-docs` to clarify terms, constraints, and decisions against the repo’s language.
3. `prototype` only if a state model, UI direction, or interaction needs to be felt before committing.
4. `to-prd` once the shape is clear.
5. `to-issues` to create thin, vertical tracer-bullet issues.
6. `triage` to mark issues as `ready-for-agent`, `ready-for-human`, `needs-info`, or `wontfix`.
7. `tdd` for implementation, one behavior at a time.
8. `handoff` if a fresh agent will continue.

### 3. Bug or performance regression

Use `diagnose`, not generic coding.

The diagnose loop is:

1. Build a deterministic feedback loop.
2. Reproduce the exact user-reported failure.
3. Form falsifiable hypotheses.
4. Instrument one hypothesis at a time.
5. Write the regression test at the correct seam.
6. Fix, re-run the original loop, remove debug instrumentation.
7. If the bug exposed architectural friction, hand off to `improve-codebase-architecture`.

Do not hypothesize without a loop. The loop is the work.

### 4. Turning plans into autonomous work

Use `to-issues` after a PRD or plan exists. Good issues are **vertical slices**, not layer tasks:

- bad: “create database schema,” “add API endpoint,” “build UI”
- good: “user can complete one narrow end-to-end path with schema + API + UI + tests”

Mark slices as:

- **AFK** when an agent can complete them without human judgment,
- **HITL** when human decisions, design review, credentials, or manual validation are required.

This is how vague plans become safe autonomous-agent work.

### 5. Architecture improvement

Use `improve-codebase-architecture` when the codebase is hard to test, hard to navigate, or full of shallow pass-through modules.

It should use the project’s `CONTEXT.md` vocabulary plus its own architecture vocabulary:

- **interface** — everything a caller must know to use a module,
- **depth** — how much useful behavior sits behind a small interface,
- **deletion test** — if deleting the module makes complexity disappear, it was probably pass-through; if complexity reappears across callers, it was earning its keep.

After a candidate is chosen, drop into a grilling loop and update `CONTEXT.md` / ADRs for durable decisions.

## Skill map

| Skill                           | Best use                                  | Main output                                                |
| ------------------------------- | ----------------------------------------- | ---------------------------------------------------------- |
| `setup-matt-pocock-skills`      | First use in a repo                       | Agent-skill config, issue tracker rules, domain-doc layout |
| `zoom-out`                      | Understanding unfamiliar code             | Higher-level map of the area                               |
| `grill-me`                      | General plan stress-test                  | Resolved decision tree                                     |
| `grill-with-docs`               | Repo-bound design/planning                | Updated `CONTEXT.md`, possible ADRs                        |
| `prototype`                     | Validate uncertain logic/UI               | Throwaway prototype + captured decision                    |
| `to-prd`                        | Convert known context into a product spec | PRD in the issue tracker                                   |
| `to-issues`                     | Break plan/PRD into agent work            | Vertical-slice issues                                      |
| `triage`                        | Manage issue states                       | Labels, agent briefs, needs-info notes                     |
| `tdd`                           | Feature implementation                    | Behavior tests + implementation                            |
| `diagnose`                      | Bugs/perf regressions                     | Repro loop, regression test, fix                           |
| `improve-codebase-architecture` | Refactoring/deep modules                  | Numbered deepening opportunities                           |
| `handoff`                       | Preserve session continuity               | Compact handoff document                                   |

## Practical rule of thumb

If the work is still ambiguous, **grill and document**.

If the decision is made but not scoped, **write a PRD**.

If the PRD is too large, **slice into issues**.

If an issue is ready, **triage it for an agent**.

If code needs to change, **use TDD or diagnose**.

If the change is painful, **improve the architecture**.

If context is getting long, **handoff**.
