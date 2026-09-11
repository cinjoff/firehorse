# Agent projection layout for canonical Agent Roles

Published issue: https://github.com/cinjoff/firehorse/issues/19

Status: open; ready-for-agent.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Move canonical Agent Role sources into `packages/firehorse-core/definitions/agents/` and project them to top-level provider-native agent files without `horse-` prefixes or provider `agents/firehorse/` shadow paths. This slice migrates the current reviewer/plan-reviewer roles and projection layout before adding new worker behavior.

## Acceptance criteria

- [ ] Current Agent Role sources are loaded from `packages/firehorse-core/definitions/agents/` using Definition Format v1 with `kind: agent-role`.
- [ ] Claude Agent Role outputs are generated at top-level provider-native paths such as `packages/firehorse-claude/agents/<id>.md`.
- [ ] Pi Agent Role sync/package sources are generated at top-level provider-native paths such as `packages/firehorse-pi/agents/<id>.md`.
- [ ] Provider `agents/firehorse/` Agent Role mirrors are removed when provenance confirms they are stale.
- [ ] `definitions:check` fails when stale provenanced Agent Role mirrors remain under provider `agents/firehorse/` paths.
- [ ] Package manifests/setup metadata expose top-level provider-native agent files.
- [ ] Agent Role provenance is compact frontmatter-only or the smallest generator-safety marker needed.
- [ ] `pnpm definitions:check` passes.
- [ ] `pnpm typecheck` passes if TypeScript projection code changes.

## Blocked by

None - can start immediately

## Notes

This is the first implementation slice from PRD #18 and should preserve current reviewer/plan-reviewer behavior as much as possible.
