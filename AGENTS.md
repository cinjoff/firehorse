# AGENTS.md

Canonical agent guidance for firehorse. Any LLM CLI that follows the
`AGENTS.md` convention (Codex CLI, etc.) should read this first. Claude-specific
notes live in `CLAUDE.md` and defer here for the substance.

## What this repo is

A lightweight, cross-provider agentic skills framework, shipped as a pnpm
monorepo with three packages:

- **`packages/firehorse-core`** (`firehorse` on npm) — TypeScript core library.
  Provider and orchestrator adapters. No skill runtime yet.
- **`packages/firehorse-pi`** (`firehorse-pi` on npm) — Pi.dev distribution.
  Bundles selected upstream pi packages and exposes them as extensions,
  skills, prompts, and themes. Installed with `pi install npm:firehorse-pi`.
- **`packages/firehorse-claude`** — Claude Code plugin. `.claude-plugin/plugin.json`
  manifest plus `commands/`, `agents/`, `skills/`, `hooks/` directories.
  Discovered via the repo-level `.claude-plugin/marketplace.json`.

The Pi package and Claude plugin both adapt the core lib to their respective
ecosystems. They are siblings, not derived from each other.

## Hard rules

- **No skill runtime or execution code yet.** Static, pinned upstream skills may
  be vendored when explicitly scoped, and Phase 2 may add definition
  schema/parser/validator plus build-time projection-generator code. Static
  generated provider mirrors (Pi prompts/skills/agent sync artifacts and Claude
  commands/skills/agents) must come from canonical definitions and checked
  provenance. Do not add a runtime, prompt loader, provider transport,
  autonomous execution loop, or hook until that work is explicitly scoped.
- **Provider and orchestrator code stays adapter-shaped.** Logic that depends
  on a specific vendor goes inside that vendor's adapter file — never in
  shared modules.
- **Detection is env-driven and side-effect-free.** Orchestrator `detect()` and
  `readEnvironment()` must not spawn processes, write files, or hit the
  network.
- **Cross-provider compatibility is non-negotiable.** If a feature only works
  on one provider, it lives in that provider's adapter or in the matching
  distribution package (`firehorse-pi` / `firehorse-claude`) — never in the
  core lib.
- **Each distribution owns its idioms.** Pi conventions (`extensions/`,
  `skills/`, `prompts/`, `themes/`) live in `firehorse-pi`. Claude conventions
  (`.claude-plugin/`, `commands/`, `agents/`, `skills/`, `hooks/`) live in
  `firehorse-claude`. Firehorse-authored definition sources live in
  `firehorse-core/definitions/`; shared upstream skill sources live in
  `firehorse-core/upstreams/`. Adapter copies are generated mirrors, not shared
  runtime code. Projection functions belong in core; repo scripts own file
  writes and must not overwrite non-generated files.

## Layout

```
firehorse/
├── packages/
│   ├── firehorse-core/      Core TS lib + shared definition/upstream sources
│   ├── firehorse-pi/        Pi package (publish target: `firehorse-pi`)
│   └── firehorse-claude/    Claude plugin (consumed via marketplace)
├── .claude-plugin/
│   └── marketplace.json     Repo-level Claude marketplace for Firehorse + pinned upstream plugins
└── docs/ARCHITECTURE.md
```

Refer to `docs/ARCHITECTURE.md` for the design rationale.

## Planning

Before starting work, read:

- `docs/MIGRATION-PLAN.md` — the settled plan for the Claude-only migration.
- `docs/DECISIONS.md` — binding decisions, append-only. Don't relitigate.
- `docs/PROJECT.md` — vision, scope, success criteria.
- `docs/agents/` — tracker, domain, and label conventions the skills read.

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
pnpm upstreams:check    # compare pinned upstream skills/packages to remote refs/npm
pnpm upstreams:update:shadcn-ui         # refresh official shadcn skill mirrors
pnpm upstreams:write-update-manifests   # refresh package/plugin update metadata

pnpm --filter firehorse build           # build a single package
pnpm --filter firehorse-pi typecheck
```

## Code style

- TypeScript strict mode, ESM-first, `NodeNext` resolution.
- Prefer `interface` for adapter contracts, `type` for unions / shapes.
- No default exports.
- Adapter classes extend the matching `Base*` to inherit the contract.

## Bundling upstream pi packages

The Pi package model lets `firehorse-pi` selectively re-export parts of other
pi packages (e.g. a future `pi-gsd`). Pattern:

```jsonc
{
  "dependencies": { "pi-gsd": "^0.1.0" },
  "bundledDependencies": ["pi-gsd"],
  "pi": {
    "extensions": ["extensions", "node_modules/pi-gsd/extensions/*.ts"],
    "skills": ["skills", "node_modules/pi-gsd/skills"],
  },
}
```

Pi core packages (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) stay in
`peerDependencies` with `"*"` and must **not** be bundled. Legacy upstream Pi
peer names (for example `@mariozechner/*`) may also be optional peers when a
bundled upstream package still imports them; do not bundle those core packages.

## When in doubt

Open an issue or a draft PR with the question. Don't guess at framework shape
— this scaffolding is intentionally minimal.
