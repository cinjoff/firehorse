# firehorse

> Lightweight, cross-provider agentic skills framework and curated skills distribution.

Firehorse is a small TypeScript-first framework for building agentic skill
systems that can run across different **providers** (Claude, Codex, Pi.dev, ...)
and different **orchestrators** (Superset, Conductor, tmux, or a plain
terminal). It is also a curated distribution of high-value upstream skills and
Pi packages so users can install one Firehorse package and get a coherent,
reviewed agent surface.

Firehorse is the cross-provider successor to
[`cinjoff/fhhs-skills`](https://github.com/cinjoff/fhhs-skills). The old project
was Claude-first; this repo keeps the same product idea but makes provider and
orchestrator adapters first-class, swappable concerns.

## Release status

Current release target: **v0.1.0**.

This first version is foundation + curated distribution content:

- A strict TypeScript core library with provider and orchestrator adapter
  contracts.
- A Pi.dev package (`firehorse-pi`) that bundles selected upstream Pi packages
  and exposes only Firehorse-approved extensions, skills, prompts, and themes.
- A Claude Code plugin (`firehorse-claude`) with Claude-compatible mirrors of
  the selected skill and subagent surface.
- Pinned provenance for vendored upstream skill repositories and shared agent
  definitions.
- Non-blocking update checks that point users to Firehorse releases rather than
  checking every upstream at runtime.

What is intentionally **not** in v0.1.0: a Firehorse-authored skill runtime,
prompt loader, slash-command runtime, or provider transport implementation.
Those come after the cross-provider skill format is settled.

## Install

### Pi.dev

```sh
# Published npm package
pi install npm:firehorse-pi

# Install this repository directly from GitHub
pi install git:github.com/cinjoff/firehorse

# Local development checkout
pi install ./packages/firehorse-pi
```

Then run first-time setup:

```text
/skill:firehorse-setup
```

Use `/skill:firehorse-setup --check` for a read-only setup report.

### Claude Code

```text
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

The repo-level `.claude-plugin/marketplace.json` points Claude Code at
`packages/firehorse-claude`.

### Core library

```sh
pnpm add firehorse
```

The core library is for future integrations and TypeScript consumers that want
adapter contracts directly.

## How Firehorse is wired

```text
                                      ┌──────────────────────────────┐
                                      │        GitHub releases        │
                                      │  tag vX.Y.Z + release notes  │
                                      └───────────────┬──────────────┘
                                                      │
                         runtime update checks read Firehorse version only
                                                      │
┌─────────────────────────────────────────────────────▼────────────────────────────────────────────────────┐
│                                           firehorse monorepo                                               │
│                                                                                                            │
│  ┌─────────────────────────────┐        provenance + contracts        ┌───────────────────────────────┐   │
│  │ packages/firehorse-core     │──────────────────────────────────────▶│ packages/firehorse-pi         │   │
│  │ npm: firehorse              │                                      │ npm: firehorse-pi             │   │
│  │                             │                                      │                               │   │
│  │ Providers:                  │                                      │ Pi manifest allow-list:        │   │
│  │  - Claude                   │                                      │  - Firehorse extensions        │   │
│  │  - Codex                    │                                      │  - bundled Pi extensions       │   │
│  │  - Pi.dev                   │                                      │  - selected skills             │   │
│  │                             │                                      │  - pi-subagents prompts        │   │
│  │ Orchestrators:              │                                      │  - Firehorse theme(s)          │   │
│  │  - Superset                 │                                      │                               │   │
│  │  - Conductor                │                                      │ Bundled deps:                  │   │
│  │  - tmux                     │                                      │  context-mode, pi-lens,        │   │
│  │  - terminal fallback        │                                      │  pi-mcp-adapter, pi-mermaid,   │   │
│  │                             │                                      │  pi-subagents, pi-web-access   │   │
│  │ Upstream sources:           │                                      └───────────────┬───────────────┘   │
│  │  mattpocock/skills          │                                                      │                   │
│  │  pbakaus/impeccable         │                                      installed by Pi │                   │
│  │  pi-subagents agents        │                                                      ▼                   │
│  └──────────────┬──────────────┘                                      ┌───────────────────────────────┐   │
│                 │                                                     │ User's Pi agent session        │   │
│                 │ adapter mirrors                                     │  - skills load on demand       │   │
│                 │                                                     │  - MCP adapter available       │   │
│                 │                                                     │  - subagent defaults applied   │   │
│  ┌──────────────▼──────────────┐                                      └───────────────────────────────┘   │
│  │ packages/firehorse-claude   │                                                                  ▲       │
│  │ Claude Code plugin          │                                                                  │       │
│  │                             │        plugin marketplace install                                  │       │
│  │  - Claude skills mirrors    │──────────────────────────────────────────────────────────────────┘       │
│  │  - shared agents mirrors    │                                                                          │
│  │  - SessionStart hook        │                                                                          │
│  └─────────────────────────────┘                                                                          │
└────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

The key design principle: **bundling and surfacing are separate decisions**.
`firehorse-pi` may depend on and bundle an upstream package, but the Pi manifest
is still an explicit allow-list. Users see the curated Firehorse surface, not
every file in every bundled package.

## Package layout

```text
firehorse/
├── packages/
│   ├── firehorse-core/      TypeScript core library (npm: firehorse)
│   ├── firehorse-pi/        Pi.dev package (npm: firehorse-pi)
│   └── firehorse-claude/    Claude Code plugin distribution
├── .claude-plugin/          Repo-level Claude marketplace
├── .agents/skills/          Repo-local maintainer skills
├── docs/                    Architecture and upstream provenance docs
└── scripts/                 Maintainer upstream-check/update utilities
```

### `packages/firehorse-core` (`firehorse`)

The core package defines the stable contracts:

| Area | Included adapters | Role |
| --- | --- | --- |
| Providers | Claude, Codex, Pi.dev | Declare provider identity and capability shape. Current implementations are side-effect-free availability scaffolds; actual transport wiring is future work. |
| Orchestrators | Superset, Conductor, tmux, terminal | Detect the shell/workspace owner from environment variables only and expose capabilities such as worktrees, parallel agents, shared filesystem, and port assignment. |
| Upstream provenance | `mattpocock/skills`, `pbakaus/impeccable`, `pi-subagents` agents | Stores pinned upstream files, licenses, and `UPSTREAM.json` manifests that distribution packages mirror or consume. |

Detection is intentionally env-driven and side-effect-free: no spawning
processes, writing files, or network calls in `detect()` / `readEnvironment()`.

### `packages/firehorse-pi` (`firehorse-pi`)

The Pi package exposes Firehorse through Pi conventions:

- `extensions/` — Firehorse-authored session-start extensions.
- `skills/` — Firehorse setup plus mirrored upstream skills.
- `prompts/` — Firehorse prompts plus bundled `pi-subagents` prompts.
- `themes/` — Firehorse Pi TUI theme(s).
- `package.json#pi` — the explicit Pi resource allow-list.
- `bundledDependencies` — upstream Pi packages included in the npm tarball.

Pi core packages (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) stay as
optional peer dependencies with `"*"` versions and are **not** bundled.

### `packages/firehorse-claude`

The Claude package exposes Firehorse through Claude Code plugin conventions:

- `.claude-plugin/plugin.json` lists skills, agents, and hooks explicitly.
- `skills/` mirrors the selected upstream skill set in Claude-compatible paths.
- `agents/` mirrors the shared `pi-subagents` built-in roles as Claude agents.
- `hooks/check-update.mjs` checks the latest `cinjoff/firehorse` GitHub release
  on `SessionStart` and suggests `/plugin update firehorse@firehorse`.

The Pi and Claude distributions are siblings. Neither is derived from the other
because each ecosystem has different install, manifest, hook, and agent idioms.

## Upstream packages and skill sources

### Pinned upstream skill/agent repositories

| Upstream | Pinned in | Exposed in | Role |
| --- | --- | --- | --- |
| [`mattpocock/skills`](https://github.com/mattpocock/skills) | `packages/firehorse-core/upstreams/mattpocock-skills/UPSTREAM.json` | Pi and Claude skill mirrors | Engineering/productivity skills selected from the upstream Claude plugin manifest. Deprecated, personal, in-progress, and misc skills are not exposed unless Firehorse explicitly allow-lists them later. |
| [`pbakaus/impeccable`](https://github.com/pbakaus/impeccable) | `packages/firehorse-core/upstreams/impeccable/UPSTREAM.json` | Pi and Claude `impeccable` mirrors | Frontend design and UX craft skill. Firehorse keeps canonical source/provenance in core and mirrors upstream-generated adapter variants. |
| [`pi-subagents`](https://github.com/nicobailon/pi-subagents) built-in agents | `packages/firehorse-core/upstreams/pi-subagents/UPSTREAM.json` | Pi bundled runtime + Claude agent mirrors | Shared subagent role vocabulary (`planner`, `reviewer`, `worker`, etc.). Pi consumes bundled built-ins; Claude gets markdown mirrors. |

### Bundled Pi packages

| Package | Version | Exposed resources | Role in Firehorse |
| --- | ---: | --- | --- |
| `context-mode` | `1.0.133` | Pi extension; `context-mode`, `ctx-doctor`, `ctx-insight`, `ctx-stats` skills | Keeps large command/file/MCP output out of the model context by sandboxing processing, indexing content, and enabling targeted search. Destructive/upgrade skills are intentionally not exposed by default. |
| `pi-lens` | `3.8.44` | Pi extension; `ast-grep`, `lsp-navigation` skills; direct tools | Adds structural code search/rewrite, LSP diagnostics, definitions, references, hover, and call hierarchy. Firehorse grants these tools to code-oriented subagents by default. |
| `pi-mcp-adapter` | `2.6.1` | Pi extension | Bridges MCP servers into Pi. Firehorse setup uses it for Superset's hosted MCP endpoint. |
| `pi-mermaid` | `0.3.0` | Pi extension | Renders Mermaid diagrams as ASCII in the Pi TUI. |
| `pi-subagents` | `0.24.2` | Pi extension; `pi-subagents` skill; prompt templates; built-in agents | Enables delegated agents, chains, parallel fan-out, async/background work, and clarification flows. |
| `pi-web-access` | `0.10.7` | Pi extension; `librarian` skill | Provides web search/fetch, GitHub repository reading, PDF/content extraction, video analysis, and evidence-backed library research. |

Runtime dependencies such as `@ast-grep/napi`, MCP SDK packages, `jiti`,
`beautiful-mermaid`, `mermaid`, `typescript`, `vscode-jsonrpc`,
`web-tree-sitter`, `open`, `zod`, and `minimatch` are pinned normally in
`firehorse-pi` so bundled packages have the platform/runtime pieces they need.

## Exposed skills

### Firehorse-authored skills

| Skill | Distribution | Role |
| --- | --- | --- |
| `firehorse-setup` | Pi + Claude | First-time setup and read-only checks. Detects Firehorse install state, detects Superset, configures user-global Superset MCP safely, and keeps API keys out of project files. |
| `firehorse-release` | Repo-local `.agents/skills` | Maintainer workflow for future Firehorse releases: update README/release notes, check upstreams, run quality gates, tag, push, create GitHub release, and watch GitHub Actions. Not shipped in `firehorse-pi`. |

### Bundled Pi package skills

| Skill | Source | Role |
| --- | --- | --- |
| `context-mode` | `context-mode` | Prefer `ctx_batch_execute`, `ctx_execute`, `ctx_execute_file`, and searchable indexing for large output, logs, data processing, API responses, and test/build output. |
| `ctx-doctor` | `context-mode` | Diagnose context-mode runtime, hooks, FTS5 database, plugin registration, and package versions. |
| `ctx-insight` | `context-mode` | Open the context-mode analytics dashboard for session/tool usage and savings. |
| `ctx-stats` | `context-mode` | Show how much context-mode saved this session. |
| `ast-grep` | `pi-lens` | Use AST-aware search/rewrite instead of text grep for semantic code patterns. |
| `lsp-navigation` | `pi-lens` | Use IDE-like code intelligence: definitions, references, hover, diagnostics, signatures, implementations, and call hierarchy. |
| `librarian` | `pi-web-access` | Research open-source libraries with evidence-backed answers and source-code citations. |
| `pi-subagents` | `pi-subagents` | Delegate work to built-in/custom subagents in single, chain, parallel, async, forked-context, and intercom workflows. |

### Vendored `mattpocock/skills`

| Skill | Role |
| --- | --- |
| `diagnose` | Disciplined bug/performance diagnosis loop: reproduce, minimise, hypothesise, instrument, fix, regression-test. |
| `grill-with-docs` | Stress-test a plan against project domain docs and ADRs, updating docs as decisions crystallise. |
| `triage` | Triage issues through a role/state-machine workflow for bug reports and feature requests. |
| `improve-codebase-architecture` | Find deeper architecture/refactoring opportunities informed by `CONTEXT.md` and ADRs. |
| `setup-matt-pocock-skills` | Configure repo-local issue tracker, triage labels, and domain-doc layout expected by the engineering skills. Hidden from automatic model invocation. |
| `tdd` | Test-driven development with a red/green/refactor workflow. |
| `to-issues` | Break a plan/spec/PRD into independently grabbable tracker issues. |
| `to-prd` | Turn conversation context into a PRD and publish it to the project issue tracker. |
| `zoom-out` | Ask the agent for a higher-level map of unfamiliar code and how it fits the domain model. Hidden from automatic model invocation. |
| `prototype` | Build a throwaway prototype: terminal app for state/business logic or multiple UI variations for design exploration. |
| `caveman` | Ultra-compressed communication mode for lower token usage while preserving technical accuracy. |
| `grill-me` | Interview the user relentlessly about a plan/design until shared understanding is reached. |
| `handoff` | Compact the current conversation into a handoff document for another agent. |
| `write-a-skill` | Create new Agent Skills with proper structure, progressive disclosure, references, and optional helper scripts. |

### Vendored `pbakaus/impeccable`

| Skill | Role |
| --- | --- |
| `impeccable` | Frontend interface design, critique, polish, accessibility, visual hierarchy, design systems, motion, copy, and ambitious UI craft. Based on Anthropic's frontend-design skill with upstream Impeccable customizations. |

## Shared subagent roles

Firehorse tracks the built-in `pi-subagents` role vocabulary in core and mirrors
it into Claude. Pi uses the bundled `pi-subagents` runtime definitions.

| Agent | Role |
| --- | --- |
| `context-builder` | Analyze requirements/codebase and produce compact context plus meta-prompts. |
| `delegate` | Lightweight direct delegation for bounded tasks. |
| `oracle` | High-context decision-consistency reviewer that protects inherited state and prevents drift. |
| `planner` | Produce implementation plans from requirements and context. |
| `researcher` | Search, evaluate, and synthesize focused research briefs. |
| `reviewer` | Review code diffs, plans, proposed solutions, codebase health, PRs, and issues. |
| `scout` | Fast codebase reconnaissance that returns compressed handoff context. |
| `worker` | Implementation agent for normal tasks and approved oracle handoffs. |

## Firehorse-specific overrides and customizations

Firehorse does not blindly re-export upstream packages. The first release adds
several package-owned customizations:

1. **Explicit Pi allow-list** — `package.json#pi` exposes selected resources
   only. For example, Firehorse exposes safe/read-only context-mode skills but
   not destructive or upgrade-oriented context-mode skills by default.
2. **Subagent tool defaults** — `packages/firehorse-pi/firehorse.subagents.json`
   gives code-oriented `pi-subagents` roles access to bundled `pi-lens` tools:
   `ast_grep_search`, `ast_grep_replace`, `lsp_diagnostics`, and
   `lsp_navigation`.
3. **Respect user settings** — `firehorse-subagent-defaults.ts` only fills in
   missing/defaulted tool allow-lists. User-authored overrides are left alone
   unless Firehorse previously created them. Opt out with
   `FIREHORSE_SKIP_SUBAGENT_DEFAULTS=1`.
4. **Safe Superset setup** — `firehorse-setup` configures Superset MCP in the
   user-global Pi/Claude MCP config, never in the project repo. Optional secret
   loading reads only `SUPERSET_API_KEY` and `SUPERSET_ORGANIZATION_ID` from
   `~/.config/firehorse/superset.env` and rejects group/world-readable files.
5. **Firehorse-version update checks** — Pi and Claude check Firehorse package
   or GitHub release versions, not every upstream repository. Users update one
   Firehorse package/plugin and read one Firehorse changelog.
6. **Adapter-native mirrors** — upstream skills are stored for provenance in
   core, then mirrored into Pi and Claude in each ecosystem's native layout.

## Maintainer workflow

```sh
pnpm install
pnpm upstreams:check
pnpm typecheck
pnpm build
pnpm test
```

Update pinned upstream mirrors with:

```sh
pnpm upstreams:update:mattpocock-skills
pnpm upstreams:update:impeccable
pnpm upstreams:write-update-manifests
```

For future releases, load the repo-local skill:

```text
/skill:firehorse-release
```

That skill lives at `.agents/skills/firehorse-release/` and covers upstream
update checks, README/release-note refresh, version bumps, quality gates, git
tagging, GitHub release creation, and GitHub Actions verification.

## Documentation

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — framework architecture and
  distribution rationale.
- [`docs/UPSTREAM-SKILLS.md`](./docs/UPSTREAM-SKILLS.md) — upstream provenance,
  update model, and selection policies.
- [`packages/firehorse-pi/README.md`](./packages/firehorse-pi/README.md) — Pi
  package install/setup details and bundling model.
- [`packages/firehorse-claude/README.md`](./packages/firehorse-claude/README.md)
  — Claude plugin install/setup details.

## License and notices

Firehorse is MIT licensed. Vendored and bundled upstream resources keep their
own licenses and provenance; see the package-level `THIRD_PARTY_NOTICES.md`
files and each upstream `UPSTREAM.json` manifest.
