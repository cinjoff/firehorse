# firehorse-claude

The Claude Code distribution of firehorse. A Claude plugin bundling the
Claude-adapted variants of firehorse's commands, skills, and hooks.

## Status

Plugin manifest is in place. The package exposes `firehorse-setup` for
first-time checks and user-scoped Superset MCP registration in Claude Code, and
ships a `SessionStart` hook that checks GitHub releases and suggests
`/plugin update firehorse@firehorse` when a newer Firehorse plugin version is
available. `commands/` is a placeholder until Phase 3 adds the workflow set, and
the plugin declares no upstream dependencies until Phase 2 adds them.

## Install

Two paths.

**Via marketplace** (recommended):

```text
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

The repo root contains `.claude-plugin/marketplace.json`; its Firehorse plugin
entry uses a relative source (`./packages/firehorse-claude`) so Claude Code can
install the plugin from the same GitHub repo.

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
├── skills/               Skills (each in a SKILL.md folder)
└── hooks/                SessionStart setup- and update-check hooks
```

## Relation to firehorse core

The Claude plugin is the **distribution** of firehorse. Canonical definitions
and the projection generator live in [`firehorse`](../firehorse-core) (the core
lib); `pnpm definitions:write` projects them into `commands/` and `skills/` here
and lists them in `.claude-plugin/plugin.json`.

Firehorse depends on upstream plugins and vendors nothing (D-137). Upstream
skills are declared as plugin dependencies, not copied into this package.

## Update checks

The plugin hook in `hooks/hooks.json` runs `hooks/check-update.mjs` on Claude
`SessionStart` for startup and resume. It compares this plugin's manifest
version with the latest GitHub release for `cinjoff/firehorse`. If a newer
release exists, it surfaces the update command, reload hint, and release-notes
URL.

This checks Firehorse release versions, not every upstream repository at user
runtime. Upstream drift is the Phase 4 drift check's job.

Set `FIREHORSE_SKIP_UPDATE_CHECK=1`, `FIREHORSE_OFFLINE=1`, or `CLAUDE_OFFLINE=1`
to skip the network check. Results are cached for 24 hours in
`${CLAUDE_PLUGIN_DATA}`.

## Per-project setup (future)

A future `/new-project` workflow will scaffold project-local Claude config
(`.claude/`, `docs/agents/`, the setup manifest) and then call `/index`. Not
built yet.
