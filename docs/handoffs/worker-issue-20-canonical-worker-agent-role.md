# Worker Issue #20 — Canonical Worker Agent Role

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/20
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Implemented the canonical `worker` Agent Role as a Firehorse Definition Format v1 source and regenerated provider-native outputs.

## Files changed

- `packages/firehorse-core/definitions/agents/worker.md` — new canonical Agent Role definition.
- `packages/firehorse-claude/agents/worker.md` — generated Claude provider-native projection.
- `packages/firehorse-pi/agents/worker.md` — generated Pi provider-native projection.
- `packages/firehorse-claude/.claude-plugin/plugin.json` — manifest now exposes `./agents/worker.md`.
- `packages/firehorse-core/src/definitions/definitions-cli.test.ts` — manifest fixture expects `worker.md`.
- `packages/firehorse-pi/skills/firehorse-setup/SKILL.md` — setup docs include `agents/worker.md` as a generated sync artifact.

## Acceptance coverage

- Canonical source exists at `packages/firehorse-core/definitions/agents/worker.md` with `schemaVersion: 1`, `id: worker`, and `kind: agent-role`.
- Role preserves implementation-worker behavior while adding one-test-at-a-time red/green/refactor guidance.
- Scope boundaries are explicit: parent/build owns behavior coverage, product decisions, architecture decisions, and next workflow steps.
- Role reports blockers instead of silently broadening scope.
- Provider-native `worker.md` outputs are generated for Claude and Pi.

## Validation

- `pnpm definitions:check` ✅
- `pnpm --filter firehorse exec vitest run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` ✅ (30 tests)
- `pnpm typecheck` ✅

## Notes

The worker subagent was interrupted after completing the implementation because it hit a malformed grep path while doing final searches. The main session took over validation and confirmed the issue #20 deliverables are present and passing.
