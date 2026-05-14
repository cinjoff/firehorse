# Architecture

Firehorse splits two concerns that previous Claude-only frameworks tangled:

1. **What an agent is** — its skills, prompts, capabilities.
2. **Where and how it runs** — which LLM provider, which orchestrator.

The core lib codifies (2). The distribution packages codify (1) in each
ecosystem's native shape.

## Two axes

```
                ┌──────────────────┐
                │   Skill / Agent  │   (TBD — not in scaffolding)
                └────────┬─────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
       ┌────▼────┐               ┌────▼────┐
       │ Provider│               │Orchestr.│
       └────┬────┘               └────┬────┘
            │                         │
   Claude/Codex/Pi          Superset/Conductor/tmux/terminal
```

Skills (defined later) only talk to these two interfaces. They never reach
for vendor SDKs directly.

### Provider

`packages/firehorse-core/src/providers/provider.ts`. A provider exposes:

- `id`, `displayName`, `capabilities` (streaming, tool use, vision, parallel
  tool calls).
- `isAvailable()` — checks env vars / installed CLIs. Pure read; no network.

Add a provider by extending `BaseProvider` and registering it in
`packages/firehorse-core/src/providers/index.ts`.

### Orchestrator

`packages/firehorse-core/src/orchestrators/orchestrator.ts`. An orchestrator
exposes:

- `id`, `displayName`, `capabilities` (worktrees, parallel agents, port
  assignment, shared filesystem).
- `detect(env)` — synchronous env-var check.
- `readEnvironment(env)` — extracts `rootPath`, `workspacePath`,
  `workspaceName`, `port` when present.

Detection resolution order (`detect.ts`):

1. Superset — `SUPERSET_WORKSPACE_NAME` / `SUPERSET_ROOT_PATH`.
2. Conductor — `CONDUCTOR_WORKSPACE_NAME` / `CONDUCTOR_ROOT_PATH`.
3. tmux — `TMUX`.
4. Terminal — always matches (fallback).

First adapter whose `detect()` returns true wins.

## Upstream skills and subagents

The core package owns pinned upstream skill sources and shared subagent
definitions under `packages/firehorse-core/upstreams/`. Each upstream has an
`UPSTREAM.json` file recording its source repository or npm package, pinned
version/ref, license, selection policy, and adapter paths.

Distribution packages do not fetch upstream repositories at install time. They
mirror selected skill directories and subagent definitions from core into their
own package layouts, then expose those mirrors through native manifests. Users
update the Firehorse package/plugin version to receive upstream skill or agent
updates; runtime update checks look at Firehorse releases/packages rather than
upstream repository heads.

## Distribution packages

The core lib alone isn't directly useful to most users — they don't write
firehorse code, they install a CLI plugin or a pi extension. So firehorse
ships two distributions that adapt the core to each ecosystem's idioms.

### firehorse-pi

`packages/firehorse-pi`. A [Pi package](https://pi.dev/docs/latest/packages)
with `pi-package` keyword and a `pi` manifest in `package.json` pointing at
curated extensions and skills.

Pi's dependency model lets a package selectively bundle other pi packages by
listing them in both `dependencies` and `bundledDependencies`, then referencing
their `node_modules/<pkg>/...` paths in the `pi` manifest. Firehorse-pi uses
this to re-export curated parts of upstream pi packages (`context-mode`,
`pi-lens`, `pi-mcp-adapter`, `pi-mermaid`, `pi-subagents`, and `pi-web-access`
today; future packages can be added the same way) — users install firehorse-pi
**once globally** and get the Firehorse-approved surface area. The package may
bundle more upstream files than it exposes; the `pi` manifest is an explicit
resource allow-list.

Firehorse-pi also includes `firehorse.subagents.json`, a package-owned default
override manifest for built-in `pi-subagents` roles. A small session-start
extension applies missing defaults to user settings so code-oriented subagents
can use the bundled `pi-lens` tools without each user configuring those
allowlists by hand. Existing user-authored tool allowlists are respected unless
Firehorse previously created them.

Pi core packages (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) go in
`peerDependencies` with `"*"` per Pi's contract.

A lightweight Pi extension checks npm's latest `firehorse-pi` version on
`session_start` and suggests `pi update npm:firehorse-pi` when the installed
package is behind. This is throttled and disabled by `FIREHORSE_SKIP_UPDATE_CHECK`,
`FIREHORSE_OFFLINE`, or `PI_OFFLINE`.

### firehorse-claude

`packages/firehorse-claude`. A [Claude Code plugin](https://docs.claude.com/en/docs/claude-code/plugins)
with `.claude-plugin/plugin.json` plus `commands/`, `agents/`, `skills/`,
`hooks/` directories. Exposed skills and shared subagents are listed explicitly
in `.claude-plugin/plugin.json`.

Discovery is via the repo-level `.claude-plugin/marketplace.json`, so users
add the marketplace once and install the plugin in one go.

A `SessionStart` hook checks the latest GitHub release for `cinjoff/firehorse`
and suggests `/plugin update firehorse@firehorse` when the plugin manifest
version is behind. The release notes URL is surfaced as the changelog.

### Why distributions are siblings, not derived

A naive design would build firehorse-claude on top of firehorse-pi (or vice
versa). We don't, because each ecosystem has different idioms:

- Pi packages are loaded by file convention; agents are TypeScript extensions.
- Claude plugins are loaded by directory convention; agents are Markdown.

A shared "intermediate format" would be a lossy abstraction over both. Better:
the **core lib** captures the cross-cutting parts (provider/orchestrator), and
each distribution package owns the rest.

## Per-project setup

Both distributions will eventually expose a `fh:new-project`-style command to
scaffold project-local config. Not built yet; out of scope for the current
scaffolding.

## What is intentionally not here

- No skill / agent runtime. Format, loader, prompt assembly, tool wiring —
  all TBD. Vendored upstream skills are static distribution content only.
- No provider transport (HTTP clients, SSE parsing). Capabilities are
  declared; execution is not wired.
- No CLI. The framework is a library first.
- No persistence, no caching, no telemetry.
- No firehorse-authored commands, agents, prompts, or skill runtime. Current
  distribution content is static upstream mirrors, curated Pi package
  re-exports, and non-blocking update-check hooks.

These are deferred until the skill model is decided.
