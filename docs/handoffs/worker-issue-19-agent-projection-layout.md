# Issue #19 handoff: Agent projection layout for canonical Agent Roles

## Scope

GitHub issue: https://github.com/cinjoff/firehorse/issues/19

Implemented the agent-role projection layout slice from PRD #18. This handoff only covers issue #19; it does not implement #20 worker role behavior or later workflow/setup slices.

## What changed

- Canonical Agent Role sources now live under `packages/firehorse-core/definitions/agents/`.
- `definitionKindDirectories["agent-role"]` now maps to `agents`.
- Agent Role projections now emit top-level provider-native files:
  - Claude: `packages/firehorse-claude/agents/<id>.md`
  - Pi sync artifacts: `packages/firehorse-pi/agents/<id>.md`
- Generated Agent Role mirrors no longer include the visible HTML generation notice; they retain frontmatter provenance only.
- `definitions:write` scans top-level provider agent directories and removes stale provenanced `agents/firehorse/` mirrors.
- Claude plugin manifest now references top-level generated agent files.
- Definition tests, CLI tests, Definition Format docs, architecture docs, AGENTS guidance, and `firehorse-setup` sync docs were updated for the new layout.

## Validation

- `pnpm definitions:write` — exit 0; updated 20 generated mirrors/manifests.
- `pnpm definitions:check` — exit 0; validated 10 definitions, 20 generated mirrors, and manifests.
- `pnpm --filter firehorse test -- --run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` — exit 0; 29 tests passed.
- `pnpm --filter firehorse typecheck` — exit 0.
- `pnpm typecheck` — exit 0.

## Notes and risks

- The worktree had many pre-existing dirty files before #19 work started. I avoided intentionally editing unrelated work; review should scope findings to the issue #19 paths.
- Existing generated top-level `packages/firehorse-claude/agents/reviewer.md` was overwritten as a Firehorse-owned Agent Role projection per D-142.
- Empty stale directories remain at `packages/firehorse-claude/agents/firehorse/` and `packages/firehorse-pi/agents/firehorse/`; the stale generated markdown mirrors inside them were removed.
