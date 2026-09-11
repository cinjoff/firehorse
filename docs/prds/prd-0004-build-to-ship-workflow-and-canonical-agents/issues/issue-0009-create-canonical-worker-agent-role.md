# Create canonical worker Agent Role

Published issue: https://github.com/cinjoff/firehorse/issues/20

Status: open; blocked by issue #19.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Create a canonical `worker` Agent Role under `packages/firehorse-core/definitions/agents/`, seeded from the current provider/upstream worker wording. Preserve existing behavior with minimal additions for TDD discipline, scope boundaries, and parent-owned decisions.

## Acceptance criteria

- [ ] `packages/firehorse-core/definitions/agents/worker.md` exists and validates as Definition Format v1 with `kind: agent-role`.
- [ ] The role preserves the current worker implementation guidance where useful.
- [ ] The role adds one-test-at-a-time red/green/refactor guidance when behavior-level tests are feasible.
- [ ] The role makes scope boundaries explicit: parent/build owns behavior coverage, product decisions, and architecture decisions.
- [ ] The role reports blockers instead of silently broadening scope.
- [ ] Provider-native `worker.md` outputs are generated from the canonical source.
- [ ] `pnpm definitions:check` passes.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/19
