# Worker Issue #21 — Build Workflow TDD / Worker / Reviewer / GitHub Status

## Issue

- GitHub: https://github.com/cinjoff/firehorse/issues/21
- Parent PRD: https://github.com/cinjoff/firehorse/issues/18

## Result

Updated the canonical `build` workflow so it uses canonical `worker` and `reviewer` Agent Roles, documents parent-owned TDD and review gates, moves the scoped Published Issue to In Progress after scope confirmation, and requires alternate feedback-loop rationale when behavior-level automated tests are infeasible.

## Files changed

- `packages/firehorse-core/definitions/workflows/build.md` — canonical workflow update.
- `packages/firehorse-claude/commands/firehorse/horse-build.md` — refreshed Claude generated mirror.
- `packages/firehorse-pi/prompts/firehorse/horse-build.md` — refreshed Pi generated mirror.
- `packages/firehorse-core/src/definitions/definitions.test.ts` — coverage for worker/reviewer roles, TDD, GitHub status, alternate loop, reviewer gate, and parent ownership.
- `docs/handoffs/worker-issue-21-build-workflow-tdd-worker-reviewer-status.subagent.md` — worker handoff.

## Acceptance coverage

- `build` frontmatter references canonical `worker` and `reviewer` Agent Roles.
- `build` instructs moving the scoped Published Issue to In Progress with `gh` after scope confirmation.
- Parent workflow owns scope, TDD contract, implementation evidence, review gate, and completion.
- Workflow specifies one-test-at-a-time red/green/refactor where feasible.
- Workflow requires a named alternate feedback loop plus rationale when behavior-level automated tests are infeasible.
- Workflow includes a reviewer gate for non-trivial changes.
- `horse-build` provider mirrors were refreshed.

## Validation

- `pnpm definitions:check` ✅
- `pnpm --filter firehorse exec vitest run src/definitions/definitions.test.ts src/definitions/definitions-cli.test.ts` ✅ (30 tests)
- `pnpm typecheck` ✅

## Notes

The worker subagent completed successfully, then was paused after interrupt while the main session took over final validation and GitHub sync.
