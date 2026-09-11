# Worker Issue #24 — New-Project GitHub Repository and Tracker Project Setup

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/24
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Implemented the canonical `new-project` workflow and generated provider-native `horse-new-project` surfaces for Claude and Pi. The workflow defines setup guidance only; it does not mutate live GitHub state during implementation.

## Files changed

- `packages/firehorse-core/definitions/workflows/new-project.md` — new canonical Workflow Definition Format v1 source.
- `packages/firehorse-claude/commands/firehorse/horse-new-project.md` — generated Claude command mirror.
- `packages/firehorse-pi/prompts/firehorse/horse-new-project.md` — generated Pi prompt mirror.
- `package.json` — root Pi manifest exposes `horse-new-project`.
- `packages/firehorse-pi/package.json` — Pi package manifest exposes `horse-new-project`.
- `packages/firehorse-claude/.claude-plugin/plugin.json` — Claude plugin manifest exposes `horse-new-project`.
- `packages/firehorse-core/src/definitions/definitions.test.ts` — focused definition/projection/content coverage for `new-project`.
- `packages/firehorse-core/src/definitions/definitions-cli.test.ts` — manifest expectation includes `horse-new-project`.

## Acceptance coverage

- Canonical `new-project` workflow exists under `packages/firehorse-core/definitions/workflows/` and projects to `horse-new-project`.
- Workflow supports creating a missing GitHub repository or configuring an existing repository after explicit scope confirmation.
- Workflow guides creating/reusing a repository-named Tracker Project under the same owner when permissions allow.
- Workflow requires/verifies Status options: Backlog, Ready, In Progress, In Review, and Done.
- Workflow installs/verifies Matt Pocock issue-tracker labels, including `ready-for-agent`.
- Workflow writes/updates non-secret `.firehorse/manifest.json` with project name, GitHub owner/repo, Tracker Project name/ID, Status field/options, label vocabulary, and read-only safe-apply policy.
- Workflow records missing GitHub Project automation as a setup gap rather than blocking repository creation.
- Generated Claude/Pi surfaces and manifests were refreshed with `pnpm definitions:write`.

## Validation

- `pnpm definitions:check` ✅ — validated 13 definitions, 26 generated mirrors, and manifests.
- `pnpm --filter firehorse exec vitest run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` ✅ — 32 tests passed.
- `pnpm typecheck` ✅ — workspace typecheck passed.
- Acceptance content check ✅ — canonical workflow, generated mirrors, manifests, and tests include the issue #24 requirements.

## Notes

- A first focused test run failed because the canonical text used lowercase wording for “missing GitHub Project automation”; the workflow safety gate was clarified to say “Missing GitHub Project automation” explicitly, provider mirrors were regenerated, and validation passed afterward.
- No live GitHub repositories, Projects, fields, labels, PRs, releases, or issue states were mutated by this implementation.
- This issue only defines the workflow/setup guidance and generated surfaces. It does not add a workflow runtime, provider transport, prompt loader, session-start mutator, autonomous setup bot, or long-lived service.
