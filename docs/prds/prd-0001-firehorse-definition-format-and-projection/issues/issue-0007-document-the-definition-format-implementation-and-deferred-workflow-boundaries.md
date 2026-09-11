# Superseded: Document the Definition Format implementation and deferred workflow boundaries

Published issue: https://github.com/cinjoff/firehorse/issues/9

Status: closed. Historical criteria below mention the original `diagnose-fix`
/ `diagnostic-reviewer` fixture set. PRD-0002 replaced `diagnose-fix` with
`fix-bug` and no `horse-diagnose-fix` alias; later agent-role direction also
moves review behavior toward canonical reviewer roles. Do not use this issue to
recreate retired definitions or generated mirrors.

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Update contributor-facing documentation so future agents can author definitions, regenerate mirrors, and understand which workflow/runtime concerns remain deferred.

## Acceptance criteria

- [ ] Documentation explains schema version 1 for workflows, Firehorse-authored skills, and agent roles using the project glossary vocabulary.
- [ ] Historical criterion: documentation includes complete examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`. Current docs should instead use `fix-bug`, `feedback-loop`, `verification-contract`, and current canonical reviewer roles where relevant.
- [ ] Documentation explains how generated provider mirrors, provenance, source hashes, manifests, write mode, and check mode work.
- [ ] Documentation explicitly preserves `horse-new-project` and `horse-map-codebase` as future consumers of the generator, not part of this implementation slice.
- [ ] Documentation repeats the hard boundary that this work adds no runtime, prompt loader, provider transport, or autonomous execution loop.
- [ ] Existing architecture, agent guidance, and GitHub-tracked planning state are updated only as needed to reflect the shipped implementation.

## Blocked by

https://github.com/cinjoff/firehorse/issues/8
