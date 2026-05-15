# Generate provider mirrors for the diagnostic-reviewer agent role

Published issue: https://github.com/cinjoff/firehorse/issues/7

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Complete the third definition kind by generating provider-native mirrors for the canonical `diagnostic-reviewer` agent role.

## Acceptance criteria

- [ ] The canonical `diagnostic-reviewer` agent-role definition validates with the full documented role metadata contract plus Firehorse identity fields.
- [ ] Projection produces a Claude agent mirror and a Pi subagent-compatible mirror or sync artifact.
- [ ] Provider projections preserve canonical role intent while adapting or filtering unsupported provider-specific fields safely.
- [ ] Generated role mirrors include rendered instructions, provenance metadata, and source hashes.
- [ ] Package-local and repository-level manifests include the generated role entries deterministically where applicable.
- [ ] Tests verify role metadata validation, provider output shape, provenance, source hashing, and manifest entries.

## Blocked by

https://github.com/cinjoff/firehorse/issues/4
