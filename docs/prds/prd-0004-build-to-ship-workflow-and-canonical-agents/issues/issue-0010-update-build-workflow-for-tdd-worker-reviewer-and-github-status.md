# Update build workflow for TDD, worker, reviewer, and GitHub status

Published issue: https://github.com/cinjoff/firehorse/issues/21

Status: open; blocked by issue #20.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Update the canonical `build` workflow so it starts from an Agent-Ready Published Issue, moves that issue to In Progress with `gh` after scope confirmation, uses canonical `worker` for bounded implementation cycles, applies TDD where feasible, names alternate feedback loops where tests are infeasible, and runs a `reviewer` gate for non-trivial changes.

## Acceptance criteria

- [ ] `build` references canonical `worker` and `reviewer` Agent Roles.
- [ ] `build` instructs agents to move the scoped Published Issue to In Progress using `gh` after scope confirmation.
- [ ] `build` keeps parent ownership of scope, TDD contract, implementation evidence, review gate, and completion.
- [ ] `build` uses one-test-at-a-time TDD when feasible.
- [ ] `build` requires a named alternate feedback loop and rationale when behavior-level automated tests are infeasible.
- [ ] `build` includes a reviewer gate for non-trivial changes.
- [ ] Generated `horse-build` provider mirrors are refreshed.
- [ ] `pnpm definitions:check` passes.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/20
