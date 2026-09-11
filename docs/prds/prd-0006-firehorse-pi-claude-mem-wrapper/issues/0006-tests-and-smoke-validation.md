# Firehorse mem tests and smoke validation

Published issue: https://github.com/cinjoff/firehorse/issues/31
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Add the automated and manual validation needed to trust the Firehorse Pi memory wrapper. This slice should cover helper behavior, tool parameter shaping, lifecycle controls, stale-guidance replacement, packaging freshness, and a worker-backed smoke checklist.

## Acceptance criteria

- [ ] Unit tests cover project resolution order, env override behavior, GitHub remote/worktree fixtures, and side-effect-free operation.
- [ ] Unit tests cover worker host/port discovery, canonical `/api/health` probing, and missing-worker diagnostics.
- [ ] Unit tests cover `mem_search`, `mem_timeline`, and `mem_get_observations` parameter shaping, defaults, caps, explicit project override, and output capping.
- [ ] Unit tests cover lifecycle controls: `FIREHORSE_MEM_CAPTURE=0`, `FIREHORSE_MEM_INJECT=0|1`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS`, `FIREHORSE_MEM_INJECT_MAX_TOKENS`, and `FIREHORSE_MEM_TOOL_MAX_CHARS`.
- [ ] Tests assert that injected context/status/skills use `mem_` names and `<firehorse-mem-context>` and do not advertise stale `memory_recall`, upstream `mem-search`, `<pi-mem-context>`, or unprefixed `get_observations` instructions.
- [ ] Tests assert injected context preserves observation content while replacing headers/footers with Firehorse-owned IMPORTANT guidance and stale-memory warning.
- [ ] Typecheck, definitions checks, package manifest checks, and relevant upstream/package checks pass.
- [ ] Manual smoke checklist with a running claude-mem worker verifies `/mem-status`, `mem_search`, `mem_timeline`, `mem_get_observations`, default project scoping, capture, and later recall under the expected project.

## Blocked by

- `0001-helper-project-and-worker-discovery.md`
- `0002-firehorse-mem-progressive-tools.md`
- `0003-memory-lifecycle-capture-and-injection.md`
- `0004-packaging-and-dependency-migration.md`
- `0005-mem-skill-setup-docs-and-release-notes.md`
