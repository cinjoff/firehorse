# CLAUDE.md

Claude-specific guidance for firehorse. The canonical agent contract lives in
[`AGENTS.md`](./AGENTS.md) — read that first. This file only captures things
that are genuinely Claude-flavored.

## Project

- **firehorse** — lightweight, cross-provider agentic skills framework.
- pnpm monorepo, TypeScript, ESM-first, Node 20+.
- Status: scaffolding only.

## Packages

- `packages/firehorse-core` — TS core library (`firehorse`).
- `packages/firehorse-claude` — **this is the Claude plugin**. Manifest at
  `.claude-plugin/plugin.json`; commands/, agents/, skills/, hooks/ dirs.

The repo-level `.claude-plugin/marketplace.json` exposes the plugin so users
can `/plugin marketplace add cinjoff/firehorse`.

## Stack

- **Build:** `pnpm build` (per-package tsup).
- **Typecheck:** `pnpm typecheck`.
- **Test:** `pnpm test` (vitest, no tests yet).

## Architecture

- `packages/firehorse-core/src/providers/` — provider adapters (Claude, Codex).
  Add new providers by implementing `Provider` from `provider.ts`.
- `packages/firehorse-core/src/orchestrators/` — orchestrator adapters
  (Superset, Conductor, tmux, terminal). Detection via env vars only; no side
  effects.
- `packages/firehorse-core/src/types.ts` — shared types.

See `docs/ARCHITECTURE.md` for design rationale.

## Conventions

- No default exports. Named exports only.
- Adapter classes extend `BaseProvider` / `BaseOrchestrator`.
- Provider-specific quirks stay inside the provider adapter or the matching
  distribution package.
- Claude-adapted commands, agents, skills, and hooks live in
  `packages/firehorse-claude/` — **never** in `firehorse-core`.

## Planning refs

- **Start here:** the wayfinder map on GitHub Issues (label `wayfinder:map`) for
  current position and open work, then `docs/MIGRATION-PLAN.md` (the settled
  plan), `docs/DECISIONS.md` (binding decisions — don't relitigate),
  `docs/PROJECT.md` (vision and scope).
- `docs/prds/` stages the six parked PRDs (D-150). Treat as read-only — moving
  them into the tracker is a separate effort.
