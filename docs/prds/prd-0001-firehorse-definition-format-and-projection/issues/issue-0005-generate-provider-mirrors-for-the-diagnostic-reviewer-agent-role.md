# Superseded: Generate provider mirrors for the diagnostic-reviewer agent role

Published issue: https://github.com/cinjoff/firehorse/issues/7

Status: closed and superseded. The original `diagnostic-reviewer` role was part
of the first Definition Format fixture. Current generated mirrors no longer
expose `horse-diagnostic-reviewer`; PRD-0002 uses current reviewer roles, and
D-139 records the direction that generic review behavior consolidates under a
canonical `reviewer` Agent Role. Do not recreate the retired generated
`horse-diagnostic-reviewer` mirrors from this issue.

## Parent

https://github.com/cinjoff/firehorse/issues/2

## Historical scope

This issue originally completed the third definition kind by generating
provider-native mirrors for the canonical `diagnostic-reviewer` agent role.

## Historical acceptance criteria (do not implement)

- [ ] The canonical `diagnostic-reviewer` agent-role definition validates with the full documented role metadata contract plus Firehorse identity fields.
- [ ] Projection produces a Claude agent mirror and a Pi subagent-compatible mirror or sync artifact.
- [ ] Provider projections preserve canonical role intent while adapting or filtering unsupported provider-specific fields safely.
- [ ] Generated role mirrors include rendered instructions, provenance metadata, and source hashes.
- [ ] Package-local and repository-level manifests include the generated role entries deterministically where applicable.
- [ ] Tests verify role metadata validation, provider output shape, provenance, source hashing, and manifest entries.

## Blocked by

https://github.com/cinjoff/firehorse/issues/4
