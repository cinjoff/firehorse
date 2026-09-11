# CLAUDE.md

Claude-specific guidance for firehorse. The canonical agent contract lives in
[`AGENTS.md`](./AGENTS.md) — read that first. This file only captures things
that are genuinely Claude-flavored.

## Project

- **firehorse** — lightweight, cross-provider agentic skills framework.
- pnpm monorepo, TypeScript, ESM-first, Node 20+.
- Status: scaffolding, plus the supermemory graph app.

## Packages

- `packages/firehorse-core` — TS core library (`firehorse`).
- `packages/firehorse-claude` — **this is the Claude plugin**. Manifest at
  `.claude-plugin/plugin.json`; commands/, agents/, skills/, hooks/ dirs.
- `packages/firehorse-graph` — local Vite + React app for exploring a
  self-hosted supermemory store as a graph. Private; Vite owns its build.

The repo-level `.claude-plugin/marketplace.json` exposes the plugin so users
can `/plugin marketplace add cinjoff/firehorse`.

## Stack

- **Build:** `pnpm build` (per-package: tsup for libraries, Vite for the graph app).
- **Typecheck:** `pnpm typecheck`.
- **Test:** `pnpm test` (vitest).

## Architecture

- `packages/firehorse-core/src/definitions/` — the definition format: schema,
  parser, validator, projector, manifest merge.
- `packages/firehorse-core/src/upstreams/` — the lockfile and drift check.
- `packages/firehorse-core/src/setup/` — the `.firehorse/manifest.json` schema.

See `docs/ARCHITECTURE.md` for design rationale.

## Conventions

- No default exports. Named exports only — except tool config files whose
  loader requires one (`tsup.config.ts`, `vite.config.ts`).
- Provider-specific quirks stay in the projector or the matching distribution
  package, never in shared modules.
- Claude-adapted commands, agents, skills, and hooks live in
  `packages/firehorse-claude/` — **never** in `firehorse-core`.

## Planning refs

- **Start here:** the wayfinder map on GitHub Issues (label `wayfinder:map`) for
  current position and open work, then `docs/MIGRATION-PLAN.md` (the settled
  plan), `docs/DECISIONS.md` (binding decisions — don't relitigate),
  `docs/PROJECT.md` (vision and scope).
- **Memory:** `docs/MEMORY.md` is the runbook for the self-hosted supermemory
  server and the `firehorse-recall` skill. Recall is local-only by design.
- `docs/prds/` stages the six parked PRDs (D-150). Treat as read-only — moving
  them into the tracker is a separate effort.
