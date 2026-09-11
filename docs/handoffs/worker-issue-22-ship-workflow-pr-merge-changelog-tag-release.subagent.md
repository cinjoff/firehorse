# Worker Issue #22 — Ship Workflow for PR, Merge, Changelog, Tag, and Release

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/22
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Implemented the first-party canonical `ship` workflow and generated its provider-native `horse-ship` surfaces.

## Files changed

- `packages/firehorse-core/definitions/workflows/ship.md` — new canonical Workflow Definition Format v1 source.
- `packages/firehorse-claude/commands/firehorse/horse-ship.md` — generated Claude command mirror.
- `packages/firehorse-pi/prompts/firehorse/horse-ship.md` — generated Pi prompt mirror.
- `package.json` — root Pi manifest now exposes `horse-ship`.
- `packages/firehorse-pi/package.json` — Pi package manifest now exposes `horse-ship`.
- `packages/firehorse-claude/.claude-plugin/plugin.json` — Claude plugin manifest now exposes `horse-ship`.
- `packages/firehorse-core/src/definitions/definitions.test.ts` — projection/acceptance coverage for `ship`.
- `packages/firehorse-core/src/definitions/definitions-cli.test.ts` — manifest expectation includes `horse-ship`.

## Acceptance coverage

- Canonical `ship` workflow exists under `packages/firehorse-core/definitions/workflows/` with `schemaVersion: 1`, `id: ship`, and `kind: workflow`.
- Generated Pi and Claude `horse-ship` mirrors exist and are manifest-exposed.
- Workflow inventories changed files, solved issues, unrelated changes, and release scope before PR creation/update.
- PR body guidance uses `Closes #...` only for fully solved issues and `Refs #...` otherwise.
- Workflow requires a canonical `reviewer` gate before merge unless explicitly skipped with rationale.
- Workflow prefers squash merge unless repository convention, policy, or branch protection requires otherwise.
- Workflow creates/updates Keep a Changelog-style notes and derives release notes from them.
- Workflow decides version bump from shipped changes and states rationale.
- Workflow verifies linked issues are closed and Done where possible, reporting or repairing automation gaps.

## Validation

- `pnpm definitions:check` ✅ — validated 12 definitions, 24 generated mirrors, and manifests.
- `pnpm --filter firehorse exec vitest run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` ✅ — 31 tests passed.
- `pnpm typecheck` ✅ — workspace typecheck passed.
- Focused acceptance file checks ✅ — canonical source, generated mirrors, manifests, and tests all contain expected `ship` coverage.

## Scope notes

- Did not mutate GitHub release state, tags, PRs, or changelog content; this slice defines the workflow only.
- Did not start #23 or #24 setup-manifest/new-project scope.
- Generated mirrors were produced via `pnpm definitions:write`; they were not hand-edited.
