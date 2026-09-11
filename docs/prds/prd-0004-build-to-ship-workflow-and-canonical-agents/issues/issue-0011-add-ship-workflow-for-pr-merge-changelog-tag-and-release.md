# Add ship workflow for PR, merge, changelog, tag, and release

Published issue: https://github.com/cinjoff/firehorse/issues/22

Status: open; blocked by issue #21.

## Parent

https://github.com/cinjoff/firehorse/issues/18

## What to build

Add a first-party `ship` workflow that turns accepted changes into a pull request, links solved issues, runs review/validation gates, prefers squash merge for issue-sized slices, updates Keep a Changelog-style release notes, decides the version bump, creates a tag/release, and verifies issue/project status after merge.

## Acceptance criteria

- [ ] Canonical `ship` workflow definition exists under `packages/firehorse-core/definitions/workflows/`.
- [ ] Generated Pi and Claude `horse-ship` surfaces exist and are exposed in manifests.
- [ ] `ship` inventories changed files, solved issues, unrelated changes, and release scope before PR creation/update.
- [ ] PR body guidance uses `Closes #...` only for fully solved issues and `Refs #...` otherwise.
- [ ] `ship` requires or runs a `reviewer` gate before merge unless explicitly skipped.
- [ ] `ship` prefers squash merge unless repository convention requires otherwise.
- [ ] `ship` creates/updates Keep a Changelog-style notes and derives release notes from them.
- [ ] `ship` decides version bump from shipped changes and states the rationale.
- [ ] `ship` verifies linked issues are closed and Done where possible, reporting or repairing automation gaps.
- [ ] `pnpm definitions:check` passes.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/21
