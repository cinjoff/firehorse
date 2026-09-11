# AGENTS.md

Canonical agent guidance for firehorse. Any LLM CLI that follows the
`AGENTS.md` convention (Codex CLI, etc.) should read this first. Claude-specific
notes live in `CLAUDE.md` and defer here for the substance.

## What this repo is

A lightweight, cross-provider agent workflow framework, shipped as a pnpm
monorepo with three packages:

- **`packages/firehorse-core`** (`firehorse` on npm) — TypeScript core library.
  Provider/orchestrator adapters, canonical Firehorse definitions, definition
  parser/validator APIs, and build-time projection helpers. No skill runtime.
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
  be vendored when explicitly scoped. Firehorse-authored definitions use the
  schema/parser/validator and build-time projection generator in
  `firehorse-core`; static generated provider mirrors (Pi prompts/skills/agent
  sync artifacts and Claude commands/skills/agents) must come from canonical
  definitions and checked provenance. Do not add a runtime, prompt loader,
  provider transport, autonomous execution loop, or hook until that work is
  explicitly scoped.
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
├── CONTEXT.md               Domain glossary and resolved vocabulary
└── docs/
    ├── PROJECT.md           Long-lived product/project anchor
    ├── DECISIONS.md         Project-wide binding decision log, append-only
    ├── ARCHITECTURE.md      Current architecture and design rationale
    ├── codebase/            Durable codebase-facing anchors and conventions
    └── prds/                Planning Workspaces and PRD-specific context/decisions
```

Refer to `docs/ARCHITECTURE.md` for the design rationale.

## Project context and tracking

Before substantive work, read the relevant durable docs:

- `CONTEXT.md` — canonical domain glossary, project vocabulary, relationships,
  and flagged ambiguities.
- `docs/PROJECT.md` — long-lived vision, scope, constraints, and success
  criteria.
- `docs/ARCHITECTURE.md` — current architecture and definition/projection
  summary. When changing Definition Format schema/projection examples, also read
  the PRD-0001 appendix at
  `docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md`.
- `docs/codebase/` when present — durable codebase-facing architecture,
  structure, conventions, testing, integration, concern, and ADR anchors.
- `docs/DECISIONS.md` — project-wide binding decisions only, append-only. Don't
  relitigate; append a superseding decision when project-wide direction changes.
- Relevant `docs/prds/prd-000N-<slug>/` Planning Workspace artifacts,
  including PRD-local `DECISIONS.md`, context artifacts, and PRD-scoped
  `issues/` drafts when working on a published plan.

Roadmap, requirements, active state, and implementation tracking live in GitHub
Issues/Projects for `cinjoff/firehorse`, not in local roadmap/state files. The
old `.planning/` directory is retired; do not recreate it. Use local PRD
Planning Workspaces under `docs/prds/` for reviewable planning artifacts, and
use GitHub for the canonical tracker.

During `grill-with-docs`, `create-plan`, or similar planning sessions, record
resolved planning answers in the owning Planning Workspace's `DECISIONS.md` as
they happen. Promote only cross-PRD/project-wide choices to root
`docs/DECISIONS.md`, and promote durable codebase-facing choices to
`docs/codebase/` anchors or a codebase ADR.

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `cinjoff/firehorse` using the `gh` CLI. See `docs/agent-skills/issue-tracker.md`.

### Triage labels

The repo uses the canonical Matt Pocock triage label vocabulary. See `docs/agent-skills/triage-labels.md`.

### Domain docs

This repo uses a single-context domain-doc layout: read root `CONTEXT.md`, current architecture docs, and any ADRs/codebase docs that exist. See `docs/agent-skills/domain.md`.

### Agent role definitions

`docs/agent-skills/` configures Matt Pocock engineering skills only. Firehorse agent role definitions live in `packages/firehorse-core/definitions/agents/` and are projected into Pi/Claude adapter surfaces.

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
