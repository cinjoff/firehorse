# AGENTS.md

Canonical agent guidance for firehorse. Any LLM CLI that follows the
`AGENTS.md` convention (Codex CLI, etc.) should read this first. Claude-specific
notes live in `CLAUDE.md` and defer here for the substance.

## What this repo is

Personal Claude-only tooling, packaged as a Claude Code plugin (D-136), shipped
as a pnpm monorepo with three packages:

- **`packages/firehorse-core`** (`firehorse` on npm) — TypeScript core library.
  Canonical definitions, the projection generator, provider and orchestrator
  adapters. No skill runtime.
- **`packages/firehorse-claude`** — Claude Code plugin. `.claude-plugin/plugin.json`
  manifest plus `commands/`, `skills/`, `hooks/` directories. Discovered via the
  repo-level `.claude-plugin/marketplace.json`.
- **`packages/firehorse-graph`** — private local app that opens a self-hosted
  supermemory store as a graph, launched by `/firehorse:memory`. A browser app
  rather than a library, so Vite owns its build and nothing imports from it.

Firehorse depends on upstream plugins and vendors nothing (D-137).

## Hard rules

- **No skill runtime or execution code yet.** Static, pinned upstream skills may
  be vendored when explicitly scoped, and Phase 2 may add definition
  schema/parser/validator plus build-time projection-generator code. Static
  generated mirrors (Claude commands and skills) must come from canonical
  definitions and checked provenance. Do not add a runtime, prompt loader, provider transport,
  autonomous execution loop, or hook until that work is explicitly scoped.
- **Provider and orchestrator code stays adapter-shaped.** Logic that depends
  on a specific vendor goes inside that vendor's adapter file — never in
  shared modules.
- **Detection is env-driven and side-effect-free.** Orchestrator `detect()` and
  `readEnvironment()` must not spawn processes, write files, or hit the
  network.
- **Provider-specific behavior stays out of the core lib.** If a feature only
  works on one provider, it lives in that provider's adapter or in
  `firehorse-claude` — never in the core lib.
- **The distribution owns its idioms.** Claude conventions (`.claude-plugin/`,
  `commands/`, `skills/`, `hooks/`) live in `firehorse-claude`.
  Firehorse-authored definition sources live in `firehorse-core/definitions/`.
  Adapter copies are generated mirrors, not shared runtime code. Projection
  functions belong in core; repo scripts own file writes and must not overwrite
  non-generated files.

## Layout

```
firehorse/
├── packages/
│   ├── firehorse-core/      Core TS lib + canonical definition sources
│   ├── firehorse-claude/    Claude plugin (consumed via marketplace)
│   └── firehorse-graph/     Local supermemory graph app (private, Vite)
├── .claude-plugin/
│   └── marketplace.json     Repo-level Claude marketplace for Firehorse
└── docs/ARCHITECTURE.md
```

Refer to `docs/ARCHITECTURE.md` for the design rationale.

## Planning

Before starting work, read:

- `docs/MIGRATION-PLAN.md` — the settled plan for the Claude-only migration.
- `docs/DECISIONS.md` — binding decisions, append-only. Don't relitigate.
- `docs/PROJECT.md` — vision, scope, success criteria.
- `docs/agents/` — tracker, domain, and label conventions the skills read.
- `docs/MEMORY.md` — the self-hosted supermemory runbook. Read it before
  changing anything that touches recall, and when a session recalls nothing.

GitHub Issues is the only tracker (D-149). The wayfinder map and its child
tickets hold current position and granular work items, so neither lives in the
repo. `docs/` is hand-written and intentionally lightweight — no `gsd-tools`,
no plugin-cache symlinks. Keep it that way.

## Commands

```sh
pnpm install            # workspace install
pnpm typecheck          # runs per-package typecheck
pnpm build              # runs per-package build
pnpm test               # vitest, when tests exist
pnpm definitions:write  # regenerate Firehorse definition mirrors/manifests
pnpm definitions:check  # validate definitions and generated mirror freshness
pnpm upstreams:check    # detect upstream plugin drift against upstreams.lock.json

pnpm --filter firehorse build           # build a single package
pnpm --filter firehorse typecheck
```

## Code style

- TypeScript strict mode, ESM-first, `NodeNext` resolution.
- Prefer `interface` for adapter contracts, `type` for unions / shapes.
- No default exports, except in tool config files whose loader requires one
  (`tsup.config.ts`, `vite.config.ts`).
- Adapter classes extend the matching `Base*` to inherit the contract.

## When in doubt

Open an issue or a draft PR with the question. Don't guess at framework shape
— this scaffolding is intentionally minimal.
