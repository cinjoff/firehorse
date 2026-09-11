# Codebase Documentation

This folder is for durable, codebase-facing project anchors: documents future agents should read to understand how the current codebase is shaped and how to change it safely.

## What belongs here

- Current architecture, package boundaries, and important module relationships.
- Long-lived implementation conventions, testing conventions, integration notes, and operational constraints.
- Codebase-facing decisions that explain why the code is shaped a surprising or costly-to-reverse way.
- Freshness metadata for generated or mapped codebase docs, such as source commit/hash and capture timestamp.

## What does not belong here

- PRD requirements, issue drafts, or planning-session question logs.
- Transient scout findings, one-off research notes, or session-audit raw evidence.
- Domain vocabulary; keep that in root `CONTEXT.md`.
- Project-wide policy decisions that are not codebase-facing; keep those in root `docs/DECISIONS.md`.

## Decision promotion rule

Most `grill-with-docs` and `create-plan` answers stay in the relevant Planning Workspace at `docs/prds/prd-000N-<slug>/DECISIONS.md`.

Promote a local Planning Decision here only when it becomes durable codebase guidance: architecture, structure, conventions, testing, integrations, concerns, or a codebase-facing ADR. Promote a local Planning Decision to root `docs/DECISIONS.md` only when it becomes project-wide policy across PRDs or distributions.

## Planned anchor set

The codebase-map workflow should use focused files instead of one large map:

```text
docs/codebase/
  ARCHITECTURE.md
  STRUCTURE.md
  CONVENTIONS.md
  TESTING.md
  INTEGRATIONS.md
  CONCERNS.md
  adr/                 # create lazily when an ADR is warranted
```

Root `docs/ARCHITECTURE.md` remains the current architecture anchor until a dedicated codebase map intentionally migrates or splits it.
