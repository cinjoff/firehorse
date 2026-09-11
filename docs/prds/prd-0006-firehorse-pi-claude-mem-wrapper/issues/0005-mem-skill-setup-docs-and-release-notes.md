# Firehorse mem skill, setup docs, and release notes

Published issue: https://github.com/cinjoff/firehorse/issues/30
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Replace upstream `mem-search` guidance with Firehorse-owned `mem` guidance and update setup/release documentation for the new memory surface. This slice should make the user-facing contract clear: Firehorse uses an existing claude-mem worker, scopes to the Firehorse project, captures/injects by default with caps, and uses progressive `mem_` discovery tools.

## Acceptance criteria

- [ ] A Firehorse-owned `mem` skill documents when and how to use `mem_search`, `mem_timeline`, and `mem_get_observations`.
- [ ] The skill marks the 3-layer workflow as IMPORTANT and tells agents to fetch full observations only after filtering IDs.
- [ ] The skill explains project scoping, explicit cross-project lookup, stale memory verification, and live filesystem/LSP verification for code claims.
- [ ] Setup docs describe worker discovery, `/api/health`, `/mem-status`, missing-worker remediation, and the fact that Firehorse does not auto-install or auto-start claude-mem.
- [ ] Setup docs describe `FIREHORSE_MEM_CAPTURE`, `FIREHORSE_MEM_INJECT`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS`, `FIREHORSE_MEM_INJECT_MAX_TOKENS`, and `FIREHORSE_MEM_TOOL_MAX_CHARS`.
- [ ] Release notes explicitly announce that `memory_recall` is removed and replaced by `mem_search` → `mem_timeline` → `mem_get_observations`.
- [ ] README/setup text no longer instructs users to rely on upstream `mem-search`, `memory_recall`, or Firehorse-managed worker auto-start.
- [ ] Documentation mentions that stale memory-quality findings belong in Session Audit or a future memory-quality workflow, not wrapper-side mutation.

## Blocked by

- `0002-firehorse-mem-progressive-tools.md`
- `0004-packaging-and-dependency-migration.md`
