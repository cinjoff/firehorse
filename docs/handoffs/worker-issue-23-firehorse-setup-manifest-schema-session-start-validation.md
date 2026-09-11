# Worker Issue #23 — Firehorse Setup Manifest Schema and Session-Start Validation

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/23
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Implemented the narrow Firehorse setup manifest schema/check path and provider session-start validation surfaces for Pi and Claude.

## Files changed

- `packages/firehorse-core/src/setup/index.ts` — new setup manifest schema, parser, diagnostics, read-only setup check, and drift validation helpers.
- `packages/firehorse-core/src/setup/setup.test.ts` — tests for manifest parsing, read-only safety, marker-based detection, healthy silence, missing setup gaps, and drift detection.
- `packages/firehorse-core/src/index.ts` — exports setup APIs from the core package root.
- `packages/firehorse-core/tsup.config.ts` — adds `setup/index` build entry.
- `packages/firehorse-core/package.json` — exposes `firehorse/setup` as a public subpath export.
- `packages/firehorse-pi/extensions/firehorse-setup-check.ts` — Pi `session_start` extension for cheap read-only setup validation.
- `packages/firehorse-claude/hooks/check-setup.mjs` — Claude `SessionStart` hook for cheap read-only setup validation.
- `packages/firehorse-claude/hooks/hooks.json` — registers `check-setup.mjs` before the update check.

## Acceptance coverage

- Manifest schema/check logic records project name, GitHub owner/repo, Tracker Project name/ID, Status field/options, label vocabulary, and safe-apply policy.
- Session-start validation only runs when `.firehorse/manifest.json` or Firehorse project markers are present.
- Healthy validation is silent.
- Missing setup is reported as actionable warnings without mutating GitHub.
- Setup checks explicitly avoid workflow execution, prompt loading, provider transport, and autonomous agent startup.
- Pi and Claude provider session-start surfaces are wired.
- Tests cover manifest parsing and setup drift detection.
- Full workspace typecheck passed.

## Validation

- `pnpm --filter firehorse exec vitest run src/setup/setup.test.ts` ✅ — 6 tests passed.
- `pnpm --filter firehorse test` ✅ — 37 tests passed.
- `pnpm --filter firehorse typecheck` ✅.
- `pnpm --filter firehorse-pi typecheck` ✅.
- `node --check packages/firehorse-claude/hooks/check-setup.mjs && node --check packages/firehorse-claude/hooks/check-update.mjs` ✅.
- `pnpm definitions:check` ✅ — 12 definitions, 24 generated mirrors/manifests.
- `pnpm typecheck` ✅ — full workspace typecheck.

## Scope notes

- No live GitHub setup, ProjectV2 mutation, label creation, repository creation, PR, release, or workflow execution was added.
- This slice defines static schema/check helpers plus provider startup checks only.
- #24 new-project/repository/Tracker Project setup scope was not started here.
