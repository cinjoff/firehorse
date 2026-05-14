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
- `packages/firehorse-pi` — Pi.dev distribution (`firehorse-pi`).
- `packages/firehorse-claude` — **this is the Claude plugin**. Manifest at
  `.claude-plugin/plugin.json`; commands/, agents/, skills/, hooks/ dirs.

The repo-level `.claude-plugin/marketplace.json` exposes the plugin so users
can `/plugin marketplace add cinjoff/firehorse`.

## Stack

- **Build:** `pnpm build` (per-package tsup).
- **Typecheck:** `pnpm typecheck`.
- **Test:** `pnpm test` (vitest, no tests yet).

## Architecture

- `packages/firehorse-core/src/providers/` — provider adapters (Claude, Codex,
  Pi). Add new providers by implementing `Provider` from `provider.ts`.
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

- **Start here:** `.planning/STATE.md` (current position), then
  `.planning/ROADMAP.md` (phases), `.planning/REQUIREMENTS.md` (work items),
  `.planning/DECISIONS.md` (binding decisions — don't relitigate),
  `.planning/PROJECT.md` (vision and scope).
- `.pi/gsd/` is reference material from the prior fhhs-skills work. Treat as
  read-only — migration is out of scope until explicitly planned.
