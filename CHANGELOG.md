# Changelog

## Unreleased

## v0.5.0 — 2026-09-11

### Added

- Added `/firehorse:memory`, which opens your self-hosted supermemory store as an
  interactive graph in a browser. It starts a local server, or reuses one that is
  already running, and hands back the URL. Read-only: nothing in it writes to the
  store. This is for looking at what was stored when you cannot yet phrase the
  question — `firehorse-recall` remains the deliberate-recall path (D-144).
- Added `packages/firehorse-graph`, a private Vite + React app behind that
  command. It reads through a local proxy rather than from the browser, because
  the self-hosted supermemory server sends no CORS headers and because the API
  key must not reach the page. Three jobs get equal standing in the UI: search
  across the top, a project rail with per-project document and memory counts down
  the left, and a graph/list switch between the network view and a dense table.

  The app names a project by parsing its container tag — the supermemory plugin
  generates `repo_<name>__<sha256(remote)[:16]>`, so the name is already in the
  tag and needs no lookup.

### Fixed

- Session documents no longer display the raw transcript as their title. Captures
  from a coding session store the whole transcript in `title`, starting
  `<|turn_start|>…`; they now read as the time the session ran.

### Changed

- `AGENTS.md` and `CLAUDE.md` describe three packages rather than two, and record
  that tool config files (`tsup.config.ts`, `vite.config.ts`) are the one place a
  default export is allowed, since their loaders require it.

## v0.4.0 — 2026-09-11

### Changed

- **Breaking:** Dropped the `horse-` prefix from the plugin's workflow commands.
  They are now `/firehorse:build`, `/firehorse:fix-bug`, `/firehorse:index`,
  `/firehorse:map`, `/firehorse:new-project`, `/firehorse:ship`, and
  `/firehorse:upstreams-check`. The old `/firehorse:horse-*` names no longer
  resolve and no aliases are projected, so update any saved invocation, alias, or
  script. The plugin namespace already distinguishes these commands from other
  plugins', which is why the prefix went. See D-151, superseding D-52 and the
  native-invocation half of D-58.
- Docs now spell commands in the `/firehorse:<id>` form the plugin actually
  installs, rather than the bare `/<id>` shorthand.

### Removed

- Removed the `nativeName()` export from the `firehorse` core library. With the
  prefix gone it returned its argument unchanged. This affects only direct
  importers of the library, not the plugin surface.

## v0.3.0 — 2026-05-18

### Added

- Added the Pi-native Firehorse TUI extension with a custom footer showing Git
  branch, color-coded context-window usage, and the active model inline.
- Added the `firehorse` Pi theme with Firehorse red, ember, and terminal-green
  accents.
- Added a right-aligned compact ASCII horse indicator with green eye, fire mane,
  spacer row, and busy-time gallop frames.
- Added `/firehorse-cheatsheet` and `/fh-cheatsheet` quick-reference commands,
  plus a sectioned Cheatsheet modal for setup, planning, building, quality, and
  design workflows.

### Changed

- Kept terminal mouse tracking disabled by default so normal terminal scrollback
  keeps working; clickable footer Cheatsheet handling now requires explicit
  `FIREHORSE_ENABLE_MOUSE=1` or `FIREHORSE_ENABLE_FOOTER_CLICK=1` opt-in.
- Updated Firehorse Pi TUI docs with motion, horse, working-indicator, and mouse
  handling environment toggles.
- Updated the repo-local Firehorse release skill to use a PR-first release flow:
  open a PR, squash-merge it to `main`, then tag the post-merge `main` commit.
- Added a CI-friendly `pnpm upstreams:check:warn` mode so intentionally pinned
  upstream updates can be reported in PR checks without blocking the release.

### Packages

- `firehorse` v0.3.0
- `firehorse-pi` v0.3.0
- `firehorse-claude` plugin v0.3.0

### Bundled / mirrored upstreams

- `context-mode` 1.0.135
- `pi-lens` 3.8.44
- `pi-mcp-adapter` 2.6.1
- `pi-mermaid` 0.3.0
- `pi-subagents` 0.24.3
- `pi-web-access` 0.10.7
- `pi-agent-memory` 0.3.4
- `claude-mem` 13.2.0
- `mattpocock/skills` pinned at `e74f0061bb67222181640effa98c675bdb2fdaa7`
- `pbakaus/impeccable` pinned at `4af581e23f17d112d8f9d6b7a5b7ff37823494e1`
- `shadcn/ui` pinned at `36139f6200d9c2684ef7695fce5f3d9787378e26`

### Notes

- Upstream updates for `pbakaus/impeccable`, `shadcn/ui`, and `context-mode`
  were intentionally deferred for this release; v0.3.0 ships the current pinned
  upstream set plus Firehorse TUI/theme changes.
- Firehorse v0.3.0 still intentionally does not include a Firehorse-authored
  skill runtime, prompt loader, command runtime, hook runtime, or provider API
  transport implementation.

## v0.2.0 — 2026-05-15

### Added

- Added Firehorse Definition Format v1 parser, validator, build-time projections,
  generated mirror freshness checks, and repository-script regression tests.
- Added generated `horse-diagnose-fix` and `horse-update-upstreams` workflow
  prompts/commands for Pi and Claude.
- Added pinned `claude-mem` upstream metadata, exposed the upstream Claude
  plugin as a Firehorse marketplace dependency, and bundled the `claude-mem` npm
  package in Firehorse-pi so Pi-only users have the memory worker runtime.
- Added bundled `pi-agent-memory` for Pi, exposing its memory extension and
  `mem-search` skill through explicit manifest paths, backed by the bundled
  claude-mem worker.
- Added the official `shadcn/ui` `shadcn` skill as a pinned upstream mirrored
  into both Pi and Claude.
- Recorded that future `new-project` shadcn/ui flows should derive and apply a
  shadcn preset from `docs/DESIGN.md` before component implementation.

### Changed

- Updated `context-mode` from 1.0.133 to 1.0.135.
- Updated `pi-subagents` from 0.24.2 to 0.24.3 and refreshed the pinned core
  agent provenance mirror.
- Updated `pbakaus/impeccable` from `1e8356fa259153b56213fa434a822bbf4a885f39`
  to `4af581e23f17d112d8f9d6b7a5b7ff37823494e1` and refreshed its Pi/Claude
  mirrors.

### Packages

- `firehorse` v0.2.0
- `firehorse-pi` v0.2.0
- `firehorse-claude` plugin v0.2.0

### Bundled / mirrored upstreams

- `context-mode` 1.0.135
- `pi-lens` 3.8.44
- `pi-mcp-adapter` 2.6.1
- `pi-mermaid` 0.3.0
- `pi-subagents` 0.24.3
- `pi-web-access` 0.10.7
- `pi-agent-memory` 0.3.4
- `claude-mem` 13.2.0
- `mattpocock/skills` pinned at `e74f0061bb67222181640effa98c675bdb2fdaa7`
- `pbakaus/impeccable` pinned at `4af581e23f17d112d8f9d6b7a5b7ff37823494e1`
- `shadcn/ui` pinned at `36139f6200d9c2684ef7695fce5f3d9787378e26`

### Notes

- Firehorse v0.2.0 still intentionally does not include a Firehorse-authored
  skill runtime, prompt loader, command runtime, hook runtime, or provider API
  transport implementation.

## v0.1.0 — 2026-05-14

First Firehorse release: foundation scaffolding plus curated upstream skill distribution.

### Highlights

- Added `firehorse` core TypeScript package with provider and orchestrator adapter contracts.
- Added `firehorse-pi` Pi.dev distribution with curated extensions, skills, prompts, themes, bundled upstream Pi packages, setup skill, update checks, Superset MCP support, and subagent defaults.
- Added `firehorse-claude` Claude Code plugin distribution with mirrored skills, shared subagent roles, and SessionStart update checks.
- Added pinned upstream provenance and update tooling for `mattpocock/skills`, `pbakaus/impeccable`, and `pi-subagents` built-in agents.
- Added an extensive root README and repo-local `firehorse-release` maintainer skill.

### Packages

- `firehorse` v0.1.0
- `firehorse-pi` v0.1.0
- `firehorse-claude` plugin v0.1.0

### Bundled / mirrored upstreams

- `context-mode` 1.0.133
- `pi-lens` 3.8.44
- `pi-mcp-adapter` 2.6.1
- `pi-mermaid` 0.3.0
- `pi-subagents` 0.24.2
- `pi-web-access` 0.10.7
- `pi-agent-memory` 0.3.4
- `claude-mem` 13.2.0
- `mattpocock/skills` pinned at `e74f0061bb67222181640effa98c675bdb2fdaa7`
- `pbakaus/impeccable` pinned at `1e8356fa259153b56213fa434a822bbf4a885f39`

### Notes

- Firehorse v0.1.0 intentionally does not include a Firehorse-authored skill runtime, prompt loader, command runtime, or provider API transport implementation yet.
- Runtime update checks use Firehorse release/package versions and point users to GitHub release notes.
