# firehorse-claude

The Claude Code distribution of firehorse. A Claude plugin bundling the
Claude-adapted variants of firehorse's commands, agents, skills, and hooks.

## Status

Plugin manifest is in place and the package currently exposes the curated
`mattpocock/skills`, `pbakaus/impeccable`, and official `shadcn/ui` upstreams
mirrored from firehorse core, plus Claude-adapted mirrors of the built-in
`pi-subagents` agent set. It
also depends on the pinned upstream `claude-mem` plugin, so installing Firehorse
from the Firehorse marketplace installs Claude-Mem's own hooks, MCP server,
worker scripts, and memory skills as a separate upstream-owned plugin. Firehorse
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

The repo root contains `.claude-plugin/marketplace.json`; its Firehorse plugin
entry uses a relative source (`./packages/firehorse-claude`) so Claude Code can
install the plugin from the same GitHub repo. The same marketplace also exposes a
pinned `claude-mem` entry sourced from `thedotmack/claude-mem`'s `plugin/`
subdirectory; Firehorse declares it as a plugin dependency so Claude Code
installs it alongside Firehorse.

After install, run the setup skill once:

```text
firehorse-setup
```

Use `firehorse-setup --check` for a read-only status report. If Superset is
detected, setup registers Superset MCP in Claude Code's **user** scope using a
private `headersHelper`, not a project `.mcp.json` or literal API key.

Setup resolves the canonical repository project id with the GitHub CLI so
claude-mem memories are shared across Superset / Conductor worktrees:

```sh
gh repo view --json name --jq .name
```

It writes or validates non-secret project identity through
`FIREHORSE_PROJECT_NAME`, `CLAUDE_MEM_PROJECT`, and optionally
`~/.config/firehorse/memory.env`. Superset paths like
`~/.superset/worktrees/firehorse/<owner>/<workspace>` can hint at `firehorse`,
but Firehorse does not rely on git parent directories or cwd basenames because
Conductor worktrees may live outside the canonical repo root. Use
`firehorse-setup --memory-project <repo>` only as a manual fallback when `gh`
cannot resolve the repository. The setup flow also runs
`scripts/patch-claude-mem-project-env.cjs` so upstream claude-mem honors the
explicit env vars.

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
├── guidance/             Shared agent guidance, including claude-mem best practices
├── scripts/              Setup helpers, including claude-mem project-id patching
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

Vendored upstream skills, plugin dependencies, and shared subagent definitions
are tracked in core under `../firehorse-core/upstreams/`. This package keeps
generated Claude-shaped mirrors under `skills/` and `agents/`, including the
official `shadcn` skill under `skills/shadcn-ui/shadcn/`, then lists exposed
resources in `.claude-plugin/plugin.json`. Runtime-heavy upstreams such as
`claude-mem` stay as separate Claude plugin dependencies instead of being merged
into Firehorse's own hook/MCP/runtime files.

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
project-local Claude config (`.claude/`, planning files, etc.). When that flow
defines `docs/DESIGN.md` for a shadcn/ui stack, it should derive and apply a
shadcn preset before component implementation. Not built yet.
