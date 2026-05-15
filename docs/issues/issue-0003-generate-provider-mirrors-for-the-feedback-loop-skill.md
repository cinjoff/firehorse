# Generate provider mirrors for the feedback-loop skill

Published issue: https://github.com/cinjoff/firehorse/issues/5

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Create the first Firehorse-authored skill projection path by generating provider-native mirrors for the canonical `feedback-loop` skill.

## Acceptance criteria

- [ ] The canonical `feedback-loop` skill definition validates through the new parser and validator.
- [ ] Projection produces provider-native skill mirrors with rendered instructions rather than runtime references.
- [ ] Generated mirrors include visible generated notices, do-not-edit warnings, source definition identity, and SHA-256 source hashes.
- [ ] Generated skill output is deterministic across repeated runs.
- [ ] Tests verify output shape, provenance metadata, source hashing, and preservation of the intended instruction content.

## Blocked by

https://github.com/cinjoff/firehorse/issues/4
