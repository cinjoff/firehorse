# Domain Docs

How Matt Pocock engineering skills should consume this repo's domain and codebase documentation when exploring the codebase.

## Layout

This repo uses a **single-context** layout.

Read these sources when they are relevant to the task:

- `CONTEXT.md` at the repo root — canonical domain glossary, project vocabulary, relationships, and flagged ambiguities.
- `docs/PROJECT.md` — long-lived product/project anchor: vision, users, problem, scope, constraints, and success criteria.
- `docs/ARCHITECTURE.md` — current architecture and design rationale until intentionally split into codebase anchors.
- `docs/DECISIONS.md` — project-wide binding decisions, append-only. Do not relitigate without a superseding project-wide decision.
- `docs/prds/` — Planning Workspaces, PRD drafts, PRD-specific context, PRD-local decisions, and PRD-scoped `issues/` drafts.
- GitHub Issues/Projects for `cinjoff/firehorse` — canonical roadmap, requirements, state, and implementation tracking.
- `docs/codebase/` — durable codebase-facing docs such as architecture, structure, conventions, testing, integrations, concerns, and codebase ADRs.

If any optional docs do not exist, proceed silently. Do not suggest creating them upfront unless the task is explicitly about documenting architecture, conventions, tests, or decisions.

## Preferred future codebase docs shape

```text
docs/codebase/
  README.md
  ARCHITECTURE.md
  STRUCTURE.md
  CONVENTIONS.md
  TESTING.md
  INTEGRATIONS.md
  CONCERNS.md
  adr/
```

The current repo still has important docs outside `docs/codebase/`; read the current locations until they are intentionally migrated. The old `.planning/` directory is retired; do not recreate it for roadmap, requirements, state, or decisions. Do not put one-off research or PRD-local grilling logs in `docs/codebase/`; keep those in the relevant Planning Workspace.

## Use the glossary's vocabulary

When output names a project concept in an issue title, PRD, refactor proposal, hypothesis, test name, or review, use the term as defined in `CONTEXT.md`. Do not drift to synonyms the glossary explicitly avoids.

If a needed concept is not in the glossary yet, treat that as a signal: either reconsider whether the project uses that language, or note the gap for a future documentation/grilling pass.

## Flag decision conflicts

If a recommendation or implementation would contradict root `docs/DECISIONS.md`, a PRD-local `DECISIONS.md`, a codebase ADR, or another binding decision document, surface the conflict explicitly instead of silently overriding it.

## Firehorse's own definitions are elsewhere

This directory configures Matt Pocock engineering skills only. Firehorse's own workflow definitions live in `packages/firehorse-core/definitions/workflows/` and are projected into the Claude plugin under `packages/firehorse-claude/`. See [the architecture doc](../ARCHITECTURE.md) for the projection rules.
