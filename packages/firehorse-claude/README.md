# firehorse-claude

The Claude Code distribution of firehorse. A Claude plugin bundling the
Claude-adapted variants of firehorse's commands, agents, skills, and hooks.

## Status

Plugin manifest is in place and the package currently exposes the curated
`mattpocock/skills` and `pbakaus/impeccable` upstreams mirrored from firehorse
core, plus Claude-adapted mirrors of the built-in `pi-subagents` agent set. It
also exposes `firehorse-setup` for first-time checks and user-scoped Superset
MCP registration in Claude Code. It ships a `SessionStart` hook that checks
GitHub releases and suggests `/plugin update firehorse@firehorse` when a newer
Firehorse plugin version is available. `commands/` remains a placeholder.

## Install

Two paths.

**Via marketplace** (recommended):

```text
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

The repo root contains `.claude-plugin/marketplace.json`; its plugin entry uses
a relative source (`./packages/firehorse-claude`) so Claude Code can install the
plugin from the same GitHub repo.

After install, run the setup skill once:

```text
firehorse-setup
```

Use `firehorse-setup --check` for a read-only status report. If Superset is
detected, setup registers Superset MCP in Claude Code's **user** scope using a
private `headersHelper`, not a project `.mcp.json` or literal API key.

**As a local plugin** for development:

Point Claude Code at this directory via your Claude Code plugin config. The
plugin is recognized by the `.claude-plugin/plugin.json` manifest at the
package root. Validate from the repository root with:

```sh
claude plugin validate .
claude plugin validate packages/firehorse-claude
```

## Layout

```
firehorse-claude/
├── .claude-plugin/
│   └── plugin.json       Plugin manifest
├── commands/             Slash commands (.md)
├── agents/               Subagents (.md)
├── skills/               Skills (each in a SKILL.md folder); includes firehorse setup + upstream mirrors
└── hooks/                SessionStart update-check hook
```

## Relation to firehorse core

The Claude plugin is a **distribution** of firehorse — Claude-flavored
prompts, agents, and commands. The cross-provider logic lives in
[`firehorse`](../firehorse-core) (the core lib); this package adapts it for
Claude Code specifically.

The Pi distribution lives in [`firehorse-pi`](../firehorse-pi). The two are
intentionally siblings, not derived from each other — each adapts the core
to its provider's idioms.

Vendored upstream skills and shared subagent definitions are tracked in core
under `../firehorse-core/upstreams/`; this package keeps generated
Claude-shaped mirrors under `skills/` and `agents/`, then lists exposed resources
in `.claude-plugin/plugin.json`.

## Update checks

The plugin hook in `hooks/hooks.json` runs `hooks/check-update.mjs` on Claude
`SessionStart` for startup and resume. It compares this plugin's manifest
version with the latest GitHub release for `cinjoff/firehorse`. If a newer
release exists, it surfaces the update command, reload hint, and release-notes
URL.

This checks Firehorse release versions, not every upstream repository at user
runtime. Upstream skill changes should be vendored, reviewed, and shipped in a
Firehorse release whose changelog explains what changed.

Set `FIREHORSE_SKIP_UPDATE_CHECK=1`, `FIREHORSE_OFFLINE=1`, or `CLAUDE_OFFLINE=1`
to skip the network check. Results are cached for 24 hours in
`${CLAUDE_PLUGIN_DATA}`.

## Per-project setup (future)

A future `/fh:new-project` command will be defined here to scaffold
project-local Claude config (`.claude/`, planning files, etc.). Not built yet.
