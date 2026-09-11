# Changelog

## Unreleased

## v0.2.0 — 2026-05-15

### Added

- Added Firehorse Definition Format v1 parser, validator, build-time projections,
  generated mirror freshness checks, and repository-script regression tests.
- Added generated `horse-fix-bug` and `horse-update-upstreams` workflow
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
