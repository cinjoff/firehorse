# Document the Definition Format implementation and deferred workflow boundaries

Published issue: https://github.com/cinjoff/firehorse/issues/9

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Update contributor-facing documentation so future agents can author definitions, regenerate mirrors, and understand which workflow/runtime concerns remain deferred.

## Acceptance criteria

- [ ] Documentation explains schema version 1 for workflows, Firehorse-authored skills, and agent roles using the project glossary vocabulary.
- [ ] Documentation includes complete examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`.
- [ ] Documentation explains how generated provider mirrors, provenance, source hashes, manifests, write mode, and check mode work.
- [ ] Documentation explicitly preserves `horse-new-project` and `horse-map-codebase` as future consumers of the generator, not part of this implementation slice.
- [ ] Documentation repeats the hard boundary that this work adds no runtime, prompt loader, provider transport, or autonomous execution loop.
- [ ] Existing roadmap, requirements, architecture, and agent guidance are updated only as needed to reflect the shipped implementation.

## Blocked by

https://github.com/cinjoff/firehorse/issues/8
