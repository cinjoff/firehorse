# Add definitions write/check scripts and stale-output safety

Published issue: https://github.com/cinjoff/firehorse/issues/8

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Add repository scripts that regenerate generated mirrors and fail when canonical definitions, generated files, or manifests are stale or unsafe to modify.

## Acceptance criteria

- [ ] A write command regenerates all generated mirrors and manifest entries deterministically.
- [ ] A check command validates canonical definitions and generated mirror freshness without mutating files.
- [ ] Check mode fails when generated mirrors or manifests are stale, missing, invalid, or manually edited.
- [ ] Write mode overwrites or deletes only files with valid Firehorse provenance and refuses to modify unprovenanced files.
- [ ] The root quality gate runs the non-mutating definition check.
- [ ] Tests or scripted checks cover stale output detection, manifest sorting, safe overwrite behavior, safe delete behavior, and refusal to overwrite hand-authored files.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/5
- https://github.com/cinjoff/firehorse/issues/6
- https://github.com/cinjoff/firehorse/issues/7
