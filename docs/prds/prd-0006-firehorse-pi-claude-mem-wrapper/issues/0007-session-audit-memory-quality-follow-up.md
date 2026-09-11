# Session Audit memory-quality follow-up

Published issue: https://github.com/cinjoff/firehorse/issues/32
Status: open
Type: HITL
Proposed label: needs-triage

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Create a follow-up Session Audit / memory-quality slice that treats stale memory instructions, same-project content-domain bleed, repeated injected-context growth, and inaccurate same-session memory summaries as audit findings rather than wrapper-side memory mutations. This issue captures the quality risks discovered while grilling PRD-0006 without expanding the Firehorse memory wrapper beyond a thin claude-mem adapter.

## Acceptance criteria

- [ ] Session Audit or a follow-up Planning Workspace has a finding category for stale injected memory guidance, including obsolete tool names such as `memory_recall`, upstream `mem-search`, or unprefixed `get_observations`.
- [ ] Finding criteria distinguish stale wrapper headers/footers from historical observation content.
- [ ] Finding criteria cover same-project content-domain bleed where memory project matches but observation content is unrelated to the active task/domain.
- [ ] Finding criteria record injection growth metrics such as observation count, read tokens, work tokens, and relevance notes when available.
- [ ] Findings require corroborating transcript/session evidence and do not treat same-session memory observations as independent proof of themselves.
- [ ] The follow-up explicitly states that the Firehorse memory wrapper should not mutate stored observations in v1.
- [ ] Evidence from PRD-0006 same-session injected-context blocks is referenced as planning input without dumping raw memory beyond redacted/minimized excerpts.

## Blocked by

- PRD-0005 baseline Session Audit report review
- PRD-0006 wrapper implementation evidence
