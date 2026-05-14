# firehorse-pi

The Pi.dev distribution of firehorse. Users install this **once** globally,
and they get the full firehorse surface area for Pi (extensions, skills,
prompt templates, themes) — including selectively bundled upstream packages.

## Status

The firehorse-authored convention directories are still mostly placeholders,
but this package now exposes curated upstream content:

- `mattpocock/skills` — vendored skill set from core, mirrored into Pi paths.
- `pbakaus/impeccable` — vendored frontend design skill mirrored into Pi paths.
- `context-mode` (`1.0.133`) — Pi extension plus selected skills.
- `pi-lens` (`3.8.44`) — Pi extension plus selected skills.
- `pi-mcp-adapter` (`2.6.1`) — Pi MCP adapter extension.
- `pi-mermaid` (`0.3.0`) — Mermaid diagram rendering extension for the Pi TUI.
- `pi-subagents` (`0.24.2`) — Pi subagent extension, skill, prompt templates,
  and built-in agents shared with the Claude adapter.
- Firehorse setup — `/skill:firehorse-setup` for first-time checks and safe
  Superset MCP configuration.
- `pi-web-access` (`0.10.7`) — Pi web/search/fetch extension plus the
  `librarian` research skill.

It also ships small `session_start` extensions that check for newer
`firehorse-pi` releases, apply Firehorse subagent defaults, and load an optional
private Superset env file for `pi-mcp-adapter`. First-time setup lives in
`/skill:firehorse-setup`, including safe Superset MCP configuration when
Superset is detected.

## Install

```sh
# Published npm package (global, default)
pi install npm:firehorse-pi

# Project-local npm install
pi install -l npm:firehorse-pi

# Pinned npm version (skipped by `pi update`)
pi install npm:firehorse-pi@0.1.0

# GitHub install from this monorepo root
pi install git:github.com/cinjoff/firehorse
```

For GitHub installs, the repo-root `package.json` mirrors this package's Pi
manifest: vendored skills point at `packages/firehorse-pi/`, while bundled
upstream package resources point at the root `node_modules/` installed from the
root dependencies. For local development, point Pi directly at this package
directory:

```sh
pi install ./packages/firehorse-pi
```

## First-time setup

After installing, run:

```sh
/skill:firehorse-setup
```

Use `/skill:firehorse-setup --check` for a read-only status report. The setup
skill is the place for one-time, idempotent Firehorse configuration that should
not happen on every session start.

## Superset MCP

Superset's MCP server is a hosted HTTP endpoint, so Firehorse does not bundle a
separate Superset MCP server binary. Instead, Firehorse bundles `pi-mcp-adapter`.
When `/skill:firehorse-setup` detects Superset (for example a
`~/.superset/` directory, a Superset worktree path, the Superset app, or an
existing `SUPERSET_API_KEY`), it configures Pi to talk to
`https://api.superset.sh/api/v2/agent/mcp` from the user-global Pi MCP file
(`~/.pi/agent/mcp.json`, or `$PI_CODING_AGENT_DIR/mcp.json`). This makes the
server durable across new workspaces without writing secrets into project repos.

The setup skill adds a `superset` MCP server if one is not already configured:

```jsonc
{
  "mcpServers": {
    "superset": {
      "url": "https://api.superset.sh/api/v2/agent/mcp",
      "auth": "bearer",
      "bearerTokenEnv": "SUPERSET_API_KEY",
      "lifecycle": "lazy",
      "directTools": [
        "hosts_list",
        "projects_list",
        "workspaces_list",
        "workspaces_create",
        "agents_list",
        "agents_run",
      ],
    },
  },
}
```

Create the key in **Superset → Settings → API Keys**. Keep the value out of git:
export `SUPERSET_API_KEY` from your durable shell/launcher environment, or store
it in `~/.config/firehorse/superset.env` with mode `600`:

```sh
mkdir -p ~/.config/firehorse
chmod 700 ~/.config/firehorse
printf 'SUPERSET_API_KEY=sk_live_...\n' > ~/.config/firehorse/superset.env
chmod 600 ~/.config/firehorse/superset.env
```

The env file is optional; it exists for Pi sessions started outside a shell that
loads your profile. Firehorse's non-mutating Superset env extension loads only
`SUPERSET_API_KEY` and `SUPERSET_ORGANIZATION_ID`, and refuses to load the file
if it is group/world-readable. If Superset is not auto-detected, run
`/skill:firehorse-setup --superset` to configure it explicitly.

## Layout

```
firehorse-pi/
├── package.json          pi manifest under "pi" key, pi-package keyword
├── extensions/           .ts / .js extension files
├── skills/               SKILL.md folders + top-level .md skills
├── prompts/              .md prompt templates
└── themes/               .json themes
```

Layout follows Pi's [package conventions](https://pi.dev/docs/latest/packages).
The package is discoverable in Pi's package catalog after npm publish because
`package.json` includes the `pi-package` keyword; repository and homepage
metadata provide the catalog's GitHub links.

## Vendored upstream skills and shared agents

`mattpocock/skills` is tracked in core under
`packages/firehorse-core/upstreams/mattpocock-skills/` and mirrored here under
`skills/mattpocock/`. `pbakaus/impeccable` is tracked under
`packages/firehorse-core/upstreams/impeccable/` and mirrored here under
`skills/pbakaus/impeccable/`. The Pi manifest exposes only the mirrored skills
selected by each `UPSTREAM.json`.

The built-in `pi-subagents` agent definitions are tracked in core under
`packages/firehorse-core/upstreams/pi-subagents/` as Firehorse's shared subagent
role vocabulary. Pi uses the bundled `pi-subagents` runtime's built-in agent
files directly; Claude gets Claude-compatible mirrors under
`packages/firehorse-claude/agents/`.

Firehorse also ships `firehorse.subagents.json`, a package-owned default override
manifest for built-in `pi-subagents` agents. On session start,
`extensions/firehorse-subagent-defaults.ts` applies missing defaults into
`~/.pi/agent/settings.json`, adding the Firehorse-bundled `pi-lens` tools
(`ast_grep_search`, `ast_grep_replace`, `lsp_diagnostics`, `lsp_navigation`) to
code-oriented subagents. Existing user-authored `tools` allowlists are left
alone unless Firehorse previously created them. Set
`FIREHORSE_SKIP_SUBAGENT_DEFAULTS=1` to opt out.

Use `pnpm upstreams:check` to detect upstream changes,
`pnpm upstreams:update:mattpocock-skills` to refresh the Matt Pocock core copy
plus adapter mirrors, and `pnpm upstreams:update:impeccable` to refresh the
Impeccable core copy plus adapter mirrors.

## Bundling upstream pi packages

Firehorse-pi selectively re-exports parts of other pi packages. Today that is
`context-mode`, `pi-lens`, `pi-mcp-adapter`, `pi-mermaid`, `pi-subagents`,
and `pi-web-access`; future packages can follow the same pattern.

Bundling and surfacing are separate decisions:

- `dependencies` / `bundledDependencies` decide what ships in the tarball.
- The `pi` manifest decides what is visible to Pi users.

So Firehorse can bundle an upstream package for runtime/resources without
exposing every extension, skill, prompt, or theme from that upstream. Prefer
exact paths or tight globs in the `pi` manifest. For bundled Pi packages, the
current skill surface is an allow-list: `context-mode`, `ctx-doctor`,
`ctx-insight`, `ctx-stats`, `ast-grep`, `lsp-navigation`, `librarian`, and the
`pi-subagents` skill; destructive/upgrade-oriented context-mode skills are
intentionally not exposed by default. Firehorse also exposes the `pi-mermaid`
extension and the `pi-subagents` prompt templates because the subagent extension
uses those templates for its workflows. Vendored `mattpocock/skills` and `pbakaus/impeccable` entries are
allow-listed separately from `UPSTREAM.json`.

The pattern from the Pi docs:

```jsonc
{
  "dependencies": {
    "pi-gsd": "^0.1.0",
  },
  "bundledDependencies": ["pi-gsd"],
  "pi": {
    "extensions": ["extensions", "node_modules/pi-gsd/extensions"],
    "skills": ["skills", "node_modules/pi-gsd/skills"],
    "prompts": ["prompts", "node_modules/pi-gsd/prompts"],
  },
}
```

Selective re-export via globs and exclusions:

```jsonc
{
  "pi": {
    "extensions": [
      "extensions",
      "node_modules/pi-gsd/extensions/*.ts",
      "!node_modules/pi-gsd/extensions/legacy.ts",
    ],
  },
}
```

Add upstream Pi packages to `dependencies` and `bundledDependencies` so their
resources ship in the tarball. Firehorse pins upstream versions in
`package.json`, and `pnpm-lock.yaml` records the full resolved dependency tree
used for the next firehorse-pi package. Users only update `firehorse-pi`; the
bundled upstreams come along in the new tarball.

Runtime dependencies that do not register Pi resources stay in `dependencies`
only. For example, `pi-lens` needs `@ast-grep/napi`, `typescript`,
`vscode-jsonrpc`, `web-tree-sitter`, and `minimatch`; `pi-subagents` needs
`jiti`; `pi-mcp-adapter` needs MCP SDK packages, `open`, and `zod`; `pi-mermaid`
needs `beautiful-mermaid` and `mermaid` available from Firehorse's package root
so local-path installs do not depend on pnpm's virtual-store symlink layout; and
`pi-web-access` needs its fetch/search extraction dependencies. Leaving those
unbundled lets npm install platform-specific optional packages correctly.
Pi core packages (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
etc.) stay in `peerDependencies` with `"*"` and must **not** be bundled.

## Update checks

On session start, `extensions/firehorse-update-check.ts` compares the installed
`firehorse-pi` version with npm's latest `firehorse-pi` version. If a newer
version exists, Pi shows a notification with the npm update command (plus a Git
install hint) and GitHub release notes link.

This deliberately checks the Firehorse package version, not every upstream
repository at user runtime. Upstream skill/package changes are incorporated into
Firehorse releases; the release changelog explains what changed.

Set `FIREHORSE_SKIP_UPDATE_CHECK=1`, `FIREHORSE_OFFLINE=1`, or `PI_OFFLINE=1` to
skip the network check. Results are cached for 24 hours under `~/.firehorse/`.

## Per-project setup (future)

A `fh:new-project`-style command (sibling of the Claude plugin's) will be
added here to scaffold project-local `.pi/settings.json` and any project
resources. Not built yet.
