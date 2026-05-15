# Generate provider mirrors for the diagnose-fix workflow

Published issue: https://github.com/cinjoff/firehorse/issues/6

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Create the first workflow projection path by generating provider-native mirrors for the canonical `diagnose-fix` workflow and its supporting references.

## Acceptance criteria

- [ ] The canonical `diagnose-fix` workflow definition validates through the parser and validator.
- [ ] The workflow references the Firehorse-authored `feedback-loop` skill and the upstream `diagnose` skill through structured references.
- [ ] Projection produces a Pi prompt-template mirror and a Claude command mirror using the native `horse-` invocation convention.
- [ ] Generated workflow mirrors contain rendered instructions, provenance metadata, and source hashes.
- [ ] Package-local and repository-level manifests include the generated workflow entries deterministically.
- [ ] Tests verify workflow reference validation, generated native names, provider output shape, provenance, and manifest entries.

## Blocked by

- https://github.com/cinjoff/firehorse/issues/4
- https://github.com/cinjoff/firehorse/issues/5
