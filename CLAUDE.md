# CLAUDE.md

Claude-specific guidance for firehorse. The canonical agent contract lives in
[`AGENTS.md`](./AGENTS.md) — read that first. This file only captures things
that are genuinely Claude-flavored.

## Project

- **firehorse** — lightweight, cross-provider agentic skills framework.
- pnpm monorepo, TypeScript, ESM-first, Node 20+.
- Status: eight commands and three skills ship in the Claude plugin. The core
  library is still scaffolding.

## Packages

- `packages/firehorse-core` — TS core library (`firehorse`).
- `packages/firehorse-claude` — **this is the Claude plugin**. Manifest at
  `.claude-plugin/plugin.json`; commands/, agents/, skills/, hooks/ dirs.

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

## Agent skills

### Issue tracker

Issues live in GitHub Issues for `cinjoff/firehorse`, reached with the `gh` CLI;
the wayfinding operations — sub-issues, dependencies, the frontier query — are
recorded there too. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, each label string equal to its name. See
`docs/agents/triage-labels.md`.

### Evaluation candidates

New tools, skills, and workflows are filed through the `Evaluation candidate`
issue form and move through the `eval:` label lifecycle. The intake gate, the
paired-trial method, and the session-retro loop are in
`docs/EVALUATION-FRAMEWORK.md`.

### Domain docs

Single-context: one `CONTEXT.md` at the repo root, no `docs/adr/` yet. See
`docs/agents/domain.md`.

## Planning refs

- **Start here:** the wayfinder map on GitHub Issues (label `wayfinder:map`) for
  current position and open work, then `docs/MIGRATION-PLAN.md` (the settled
  plan), `docs/DECISIONS.md` (binding decisions — don't relitigate),
  `docs/PROJECT.md` (vision and scope).
- **Memory:** `docs/MEMORY.md` is the runbook for claude-mem and the
  `firehorse-recall` skill. The store is local; compression runs through the
  local `claude` binary on the session's own plan (D-183).
- `docs/prds/` stages the six parked PRDs (D-169). Treat as read-only — moving
  them into the tracker is a separate effort.
