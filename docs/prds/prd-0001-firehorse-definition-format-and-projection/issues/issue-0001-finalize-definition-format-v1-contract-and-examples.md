# Finalize Definition Format v1 contract and examples

Published issue: https://github.com/cinjoff/firehorse/issues/3

Status: closed. Historical criteria below mention the original `diagnose-fix`
fixture; PRD-0002 later replaced that public workflow with `fix-bug` and no
`horse-diagnose-fix` alias. Current canonical examples and generated mirrors
should be read as `fix-bug`, `feedback-loop`, `verification-contract`, and the
current review agent roles unless this historical issue is being audited.

## Parent

https://github.com/cinjoff/firehorse/issues/2

## What to build

Resolve the remaining human-reviewable Definition Format v1 contract questions and capture complete canonical examples so implementation can proceed without reopening schema design.

## Acceptance criteria

- [x] Workflow, Firehorse-authored skill, and agent-role frontmatter fields are explicitly decided for schema version 1.
- [x] Required Markdown body sections for each definition kind are documented and aligned with the existing project glossary and decision log.
- [x] Complete examples exist for the original `diagnose-fix` workflow, `feedback-loop` skill, and `diagnostic-reviewer` agent role. Historical: after PRD-0002, the current equivalent is `fix-bug` plus current supporting skills/agent roles.
- [x] The examples demonstrate Firehorse-authored references, upstream skill references, capability requirements, aliases or deprecations where relevant, and no runtime execution behavior.
- [x] The remaining open roadmap question about schema version 1 frontmatter is either closed or superseded by a new decision.

## Completion notes

Accepted by the user on 2026-05-15. D-135 records the accepted v1 contract and supersedes the pre-implementation D-134 wording where needed. TDD coverage in `packages/firehorse-core/src/definitions/definitions.test.ts` asserts that this document's canonical examples stay aligned with the checked-in source definitions.

## Blocked by

None - can start immediately
