# firehorse-claude

The Claude Code distribution of firehorse. A Claude plugin bundling the
Claude-adapted variants of firehorse's commands, skills, and hooks.

## Status

Shipping. The plugin carries seven generated workflow commands
(`/firehorse:build`, `/firehorse:fix-bug`, `/firehorse:index`,
`/firehorse:map`, `/firehorse:new-project`, `/firehorse:ship`,
`/firehorse:upstreams-check`), two skills
(`firehorse-setup` and `firehorse-recall`), and two `SessionStart` hooks — one
that checks repo setup state, one that checks for a newer Firehorse release.

It declares three dependencies — `mattpocock-skills`, `impeccable`, and
`supermemory` — so Claude Code installs all three alongside it.

## Install

Run the installer from the repository root. It adds the upstream marketplaces
this plugin's dependencies resolve from, installs the plugin, and wires up the
MCP servers and the local memory stack:

```sh
curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
```

See [the root README](../../README.md#install) for the flags and for what each
step does.

**By hand**, if you prefer. The marketplaces must come first, because Claude
Code cannot resolve a dependency from a marketplace it does not know about yet:

```text
/plugin marketplace add pbakaus/impeccable
/plugin marketplace add supermemoryai/claude-supermemory
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

The repo root contains `.claude-plugin/marketplace.json`; its Firehorse entry
uses a relative source (`./packages/firehorse-claude`) so Claude Code installs
the plugin from the same GitHub repo. That entry declares the three upstream
dependencies and allowlists their marketplaces through
`allowCrossMarketplaceDependenciesOn`. `mattpocock-skills` comes from the
built-in `claude-plugins-official` marketplace.

**As a local plugin** for development, point Claude Code at this directory via
your plugin config. The `.claude-plugin/plugin.json` manifest at the package
root is what makes it a plugin. Validate from the repository root:

```sh
claude plugin validate .
claude plugin validate packages/firehorse-claude
```

Both run as part of the `/firehorse:ship` gate; no pnpm gate reads these manifests.

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

Firehorse depends on upstream plugins and vendors nothing (D-156). Upstream
skills are declared as plugin dependencies, not copied into this package.

## Update checks

The plugin hook in `hooks/hooks.json` runs `hooks/check-update.mjs` on Claude
`SessionStart` for startup and resume. It compares this plugin's manifest
version with the latest GitHub release for `cinjoff/firehorse`. If a newer
release exists, it surfaces the update command, reload hint, and release-notes
URL.

This checks Firehorse release versions, not every upstream repository at user
runtime. Upstream drift is `/firehorse:upstreams-check`'s job.

Because the hook reads GitHub _releases_, a release cut as a tag alone leaves it
silent. `/firehorse:ship` cuts both the `v{version}` repo tag and the
`firehorse--v{version}` plugin tag that `/plugin update` resolves against, then
publishes the release the hook reads.

Set `FIREHORSE_SKIP_UPDATE_CHECK=1`, `FIREHORSE_OFFLINE=1`, or `CLAUDE_OFFLINE=1`
to skip the network check. Results are cached for 24 hours in
`${CLAUDE_PLUGIN_DATA}`.

## Per-project setup

`/firehorse:new-project` scaffolds project-local Claude config (`.claude/`,
`docs/agents/`, the setup manifest) and then calls `/firehorse:index`. The
`check-setup.mjs` hook reads the resulting `.firehorse/manifest.json` on every
session start and stays silent unless the index is stale.
