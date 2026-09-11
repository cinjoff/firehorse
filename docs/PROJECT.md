# Firehorse Project

## Vision

**Firehorse** is a lightweight, cross-provider agent workflow framework: a
leaner, multi-provider successor to [`cinjoff/fhhs-skills`](https://github.com/cinjoff/fhhs-skills).
It lets maintainers author workflows, skills, and agent roles once, then project
that surface into provider-native ecosystems such as Pi.dev and Claude Code.

Firehorse treats provider and orchestrator as first-class swappable concerns
instead of hardcoded assumptions.

## Who it's for

- Konstantin / `cinjoff`, who works across agent providers and orchestrators.
- Developers using `cinjoff/fhhs-skills` who want a lighter, less Claude-specific
  workflow distribution.
- Teams that want one agent workflow source to ship across multiple ecosystems
  without maintaining provider-specific forks.

## Problem

Existing agent-skill frameworks often mix three things that should stay
separate:

1. the user-facing workflow contract,
2. the provider-native packaging surface, and
3. runtime execution/orchestration code.

That makes skills hard to port, hard to review, and easy to drift across
providers.

## Value proposition

Firehorse keeps the workflow contract declarative and provider-neutral while
letting each distribution remain idiomatic:

- **Cross-provider by default:** Claude, Pi.dev, Codex, and future providers are
  adapter/distribution concerns, not the source model.
- **Lightweight:** no bundled app stack or cloud scaffold is required.
- **Workflow-centered:** user-facing capabilities are Workflows; Skills and Agent
  Roles are supporting ingredients.
- **Generated parity:** provider-native mirrors are checked in, provenance-marked,
  and refreshed from canonical definitions.

## Current scope

This repository is a pnpm monorepo with three packages:

| Package                     | Publish target            | Purpose                                                                                                                   |
| --------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `packages/firehorse-core`   | npm: `firehorse`          | TypeScript core library, provider/orchestrator adapters, canonical definitions, parser/validator, and projection helpers. |
| `packages/firehorse-pi`     | npm: `firehorse-pi`       | Pi.dev distribution with bundled curated Pi packages, extensions, skills, prompts, themes, and setup helpers.             |
| `packages/firehorse-claude` | Claude marketplace plugin | Claude Code plugin with generated commands, agents, skills, hooks, and plugin manifest.                                   |

Current first-party work centers on the Firehorse Definition Format and the
Planning/Build/Review/Fix workflow suite. Canonical Firehorse-authored
definitions live under `packages/firehorse-core/definitions/`; generated mirrors
live under provider-native `firehorse/` folders in the Pi and Claude packages.

## Out of scope

- A Firehorse skill runtime, prompt loader, provider transport, autonomous
  execution loop, or shared orchestration engine.
- Runtime normalization of upstream skills into Firehorse-authored definitions.
- GSD state management or `.planning/` project-state machinery.
- Sentry/observability setup as part of Firehorse project scaffolding.
- Publishing npm packages or GitHub releases without explicit maintainer action.

## Constraints

- **Language/runtime:** TypeScript, ESM-first, Node >= 20.
- **Package manager:** pnpm monorepo via `pnpm-workspace.yaml`.
- **Build:** `tsup` per package.
- **Tests:** vitest.
- **Exports:** named exports only; no default exports.
- **Adapter discipline:** provider-specific or distribution-specific behavior stays
  in that adapter/package, never in shared core modules.
- **Detection discipline:** orchestrator detection is env-driven and
  side-effect-free.
- **Generated-file discipline:** generated mirrors are edited only by changing
  canonical definitions and running the projection generator.

## Project tracking and durable docs

- Roadmap, requirements, active state, and implementation tracking live in GitHub
  Issues/Projects for `cinjoff/firehorse`.
- Project-wide binding decisions live in `docs/DECISIONS.md`; PRD-local
  planning decisions live in the owning Planning Workspace's `DECISIONS.md`.
- Domain vocabulary lives in root `CONTEXT.md`.
- Technical architecture and the current definition/projection summary live in
  `docs/ARCHITECTURE.md` until they are intentionally split into
  `docs/codebase/` anchors.
- Durable codebase-facing architecture, structure, logic, conventions, tests,
  integrations, concerns, and ADRs live or will live under `docs/codebase/`.
- PRD-specific planning artifacts live in `docs/prds/prd-000N-<slug>/` Planning
  Workspaces.
- The retired `.planning/` and root `context-gather/` directories should not be
  recreated.

## Success criteria

- Users install one package per ecosystem and get the curated Firehorse surface.
- Firehorse-authored definitions project consistently into Pi and Claude mirrors.
- Generated mirrors are deterministic, provenance-marked, and freshness-checked.
- Adding a provider or orchestrator is adapter-shaped and does not require
  rewriting workflow source material.
- `pnpm install`, `pnpm typecheck`, `pnpm build`, and relevant definition checks
  succeed on Node 20+.

## References

- Architecture and current definition/projection summary: `docs/ARCHITECTURE.md`
- Definition Format v1 PRD appendix: `docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md`
- Historical workflow grouping context: `docs/prds/prd-0001-firehorse-definition-format-and-projection/context/WORKFLOW-MAP.md`
- Upstream skills: `docs/UPSTREAM-SKILLS.md`
- Prior art: [`cinjoff/fhhs-skills`](https://github.com/cinjoff/fhhs-skills)
