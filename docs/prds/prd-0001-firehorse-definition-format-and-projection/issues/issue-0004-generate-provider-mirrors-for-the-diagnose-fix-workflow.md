# Superseded: Generate provider mirrors for the diagnose-fix workflow

Published issue: https://github.com/cinjoff/firehorse/issues/6

Status: closed and superseded. PRD-0002 replaces the old `diagnose-fix`
workflow with `fix-bug` and explicitly does not preserve a generated
`horse-diagnose-fix` alias. Do not use this issue to recreate `diagnose-fix`
mirrors; use the current `fix-bug` definitions and generated `horse-fix-bug`
mirrors instead.

## Parent

https://github.com/cinjoff/firehorse/issues/2

## Historical scope

This issue originally scoped the first workflow projection path by generating
provider-native mirrors for the canonical `diagnose-fix` workflow and its
supporting references. That workflow has since been consolidated into `fix-bug`.

## Historical acceptance criteria (do not implement)

- [ ] The canonical `diagnose-fix` workflow definition validates through the parser and validator.
- [ ] The workflow references the Firehorse-authored `feedback-loop` skill and the upstream `diagnose` skill through structured references.
- [ ] Projection produces a Pi prompt-template mirror and a Claude command mirror using the native `horse-` invocation convention.
- [ ] Generated workflow mirrors contain rendered instructions, provenance metadata, and source hashes.
- [ ] Package-local and repository-level manifests include the generated workflow entries deterministically.
- [ ] Tests verify workflow reference validation, generated native names, provider output shape, provenance, and manifest entries.

## Historical blockers

- https://github.com/cinjoff/firehorse/issues/4
- https://github.com/cinjoff/firehorse/issues/5
