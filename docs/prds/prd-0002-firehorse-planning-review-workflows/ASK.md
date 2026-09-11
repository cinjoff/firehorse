# Ask

Define the next Firehorse first-party workflows and common artifacts using the gathered repository context, upstream inventory, and legacy FHHS workflow research.

The user wants Firehorse to reauthor FHHS-inspired planning/build/review/fix patterns as first-party Firehorse Workflow definitions, while preserving Firehorse's current boundaries:

- canonical definitions live in `packages/firehorse-core/definitions/`
- generated provider mirrors come from `pnpm definitions:write`
- no runtime, autonomous execution loop, prompt loader, provider transport, or schema change in this pass
- provider-specific choreography belongs in projection notes/distribution guidance

The requested output of this planning session is a new Planning Workspace containing the ask, gathered context, planning decisions, and a PRD draft. Implementation should wait until after context is cleaned/compacted.
