# CLAUDE.md

Claude-specific guidance for firehorse. The canonical cross-provider agent
contract lives in [`AGENTS.md`](./AGENTS.md); read that first and treat this file
as Claude-only addenda.

## Claude plugin surface

- `packages/firehorse-claude/` is the Claude Code plugin package.
- Its manifest is `packages/firehorse-claude/.claude-plugin/plugin.json`.
- Claude-native generated mirrors live under that package's `commands/`,
  `agents/`, and `skills/` directories.
- The repo-level `.claude-plugin/marketplace.json` exposes the marketplace entry
  so users can `/plugin marketplace add cinjoff/firehorse`.

## Claude-specific boundaries

- Keep Claude plugin behavior in `packages/firehorse-claude/`; do not put
  Claude-specific commands, agents, skills, hooks, or plugin metadata in
  `firehorse-core`.
- Firehorse-authored Claude commands/agents/skills are generated mirrors from
  canonical definitions in `packages/firehorse-core/definitions/`. Do not
  hand-edit generated mirrors.
- Runtime-heavy upstreams such as `claude-mem` stay as plugin dependencies or
  upstream mirrors rather than becoming Firehorse runtime code.

## Context and tracking

Use the project context and tracking rules in `AGENTS.md`: durable context lives
in `CONTEXT.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/DECISIONS.md`,
and relevant `docs/prds/` Planning Workspaces; roadmap/state/requirements live in
GitHub Issues/Projects. Do not recreate `.planning/`.

`.pi/gsd/` remains read-only reference material from prior fhhs-skills work until
migration is explicitly scoped.
