# Worker Issue #22 — Ship Workflow for PR, Merge, Changelog, Tag, and Release

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/22
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Implemented the first-party canonical `ship` workflow and generated provider-native `horse-ship` surfaces for Claude and Pi.

## Files changed

- `packages/firehorse-core/definitions/workflows/ship.md` — new canonical Workflow Definition Format v1 source.
- `packages/firehorse-claude/commands/firehorse/horse-ship.md` — generated Claude command mirror.
- `packages/firehorse-pi/prompts/firehorse/horse-ship.md` — generated Pi prompt mirror.
- `package.json` — root Pi manifest exposes `horse-ship`.
- `packages/firehorse-pi/package.json` — Pi package manifest exposes `horse-ship`.
- `packages/firehorse-claude/.claude-plugin/plugin.json` — Claude plugin manifest exposes `horse-ship`.
- `packages/firehorse-core/src/definitions/definitions.test.ts` — definition/projection coverage for `ship`.
- `packages/firehorse-core/src/definitions/definitions-cli.test.ts` — manifest expectation includes `horse-ship`.
- `docs/handoffs/worker-issue-22-ship-workflow-pr-merge-changelog-tag-release.subagent.md` — worker handoff.

## Acceptance coverage

- Canonical `ship` workflow exists under `packages/firehorse-core/definitions/workflows/`.
- Generated Pi and Claude `horse-ship` surfaces exist and are exposed in manifests.
- Workflow inventories changed files, solved issues, unrelated changes, and release scope before PR creation/update.
- PR body guidance uses `Closes #...` only for fully solved issues and `Refs #...` otherwise.
- Workflow requires a canonical `reviewer` gate before merge unless explicitly skipped with rationale.
- Workflow prefers squash merge unless repository convention, policy, or branch protection requires otherwise.
- Workflow creates/updates Keep a Changelog-style notes and derives release notes from them.
- Workflow decides version bump from shipped changes and states rationale.
- Workflow verifies linked issues are closed and Done where possible, reporting or repairing automation gaps with command evidence.

## Validation

- `pnpm definitions:check` ✅ — validated 12 definitions, 24 generated mirrors, and manifests.
- `pnpm --filter firehorse exec vitest run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` ✅ — 31 tests passed.
- `pnpm typecheck` ✅ — workspace typecheck passed.

## Notes

This slice only defines the `ship` workflow. It did not mutate GitHub release state, tags, PRs, or changelog content, and did not start #23 or #24 scope.
