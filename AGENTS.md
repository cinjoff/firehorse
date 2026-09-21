# AGENTS.md

Canonical agent guidance for firehorse. Any LLM CLI that follows the
`AGENTS.md` convention (Codex CLI, etc.) should read this first. Claude-specific
notes live in `CLAUDE.md` and defer here for the substance.

## What this repo is

A thin layer over installed agent skills, for anyone building software (D-170),
packaged as a Claude Code plugin (D-155) and shipped as a pnpm monorepo with
two packages:

- **`packages/firehorse-core`** — TypeScript core library, private and unpublished.
  Canonical definitions, the projection generator, the manifest schema, and the
  upstream drift check. No skill runtime.
- **`packages/firehorse-claude`** — Claude Code plugin. `.claude-plugin/plugin.json`
  manifest plus `commands/`, `skills/`, `hooks/` directories. Discovered via the
  repo-level `.claude-plugin/marketplace.json`.

Firehorse depends on upstream plugins and vendors nothing (D-156).

## Hard rules

- **No skill runtime or execution code yet.** Static, pinned upstream skills may
  be vendored when explicitly scoped, and Phase 2 may add definition
  schema/parser/validator plus build-time projection-generator code. Static
  generated mirrors (Claude commands and skills) must come from canonical
  definitions and checked provenance. Do not add a runtime, prompt loader, provider transport,
  autonomous execution loop, or hook until that work is explicitly scoped.
- **A definition never names a vendor SDK.** It declares capabilities from the
  `requires` / `optional` vocabulary in `definitions/types.ts`; anything a
  definition needs that only one provider offers is an extension-prefixed
  capability, not a vendor call.
- **Provider-specific behaviour stays out of the core lib.** Where a target
  needs its own output paths or frontmatter, that belongs to the projector or to
  the matching distribution package — never to shared modules.
- **The distribution owns its idioms.** Claude conventions (`.claude-plugin/`,
  `commands/`, `skills/`, `hooks/`) live in `firehorse-claude`.
  Firehorse-authored definition sources live in `firehorse-core/definitions/`.
  Generated mirrors are outputs, not shared runtime code. Projection
  functions belong in core; repo scripts own file writes and must not overwrite
  non-generated files.

## Layout

```
firehorse/
├── packages/
│   ├── firehorse-core/      Core TS lib + canonical definition sources
│   └── firehorse-claude/    Claude plugin (consumed via marketplace)
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
- `docs/MEMORY.md`, the claude-mem runbook. Read it before changing anything
  that touches recall, when a session recalls nothing, and before you assume a
  denied `Read` is a bug.
- `docs/EVALUATION-FRAMEWORK.md` — how a new tool, skill, or workflow earns its
  way in, and the session-retro loop that finds most of them. Read it before
  proposing or trialling anything from outside this repo.

Planning lives in the tracker, not in repo drafts (D-168) — for this repo that
tracker is GitHub Issues, as `docs/agents/issue-tracker.md` records, and the
shipped workflows read it from there rather than assuming it (D-174). The
wayfinder map and its child tickets hold current position and granular work
items, so neither lives in the repo. `docs/` is hand-written and intentionally lightweight — no `gsd-tools`,
no plugin-cache symlinks. Keep it that way.

## When a Read is denied

claude-mem may install a `PreToolUse` gate that denies `Read` on a file over
1,500 bytes that has prior observations, and hands back a timeline of past work
on it plus four options. The gate is optional. It does not fire on a fresh
machine, on a project with no observations, or once the `Read` matcher is
removed, so nothing below is a requirement, only the order to prefer when the
ladder is on offer. Cheapest rung first:

1. Semantic priming, where the timeline titles already answer the question.
2. `get_observations([ids])` for detail from past work on the file.
3. `smart_outline(path)` for the current structure of the code, or
   `smart_unfold(path, symbol)` for one symbol of it.
4. The full read, where the file has moved on since the observations or you are
   about to edit it.

A denied `Read` is not an error and not a bug. Don't retry it verbatim, and
don't shell out to `cat` or `sed` to defeat the gate. `docs/MEMORY.md` documents
the gate's configuration and how to turn it off.

## Commands

```sh
pnpm install            # workspace install
pnpm typecheck          # definitions:check, then tsc over scripts/, then per-package
pnpm build              # runs per-package build
pnpm test               # root vitest over scripts/, then per-package test
pnpm definitions:write  # regenerate Firehorse definition mirrors/manifests
pnpm definitions:check  # validate definitions and generated mirror freshness
pnpm upstreams:check    # detect upstream plugin drift against upstreams.lock.json

pnpm --filter firehorse build           # build a single package
pnpm --filter firehorse typecheck
```

## Code style

- TypeScript strict mode, ESM-first, `NodeNext` resolution.
- Prefer `interface` for contracts, `type` for unions / shapes.
- No default exports, except in tool config files whose loader requires one
  (`tsup.config.ts`, `vite.config.ts`).

## When in doubt

Open an issue or a draft PR with the question. Don't guess at framework shape
— this scaffolding is intentionally minimal.
