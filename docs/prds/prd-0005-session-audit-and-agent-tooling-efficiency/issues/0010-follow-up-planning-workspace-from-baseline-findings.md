# Follow-up Planning Workspace from baseline findings

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: HITL
Proposed label: ready-for-human

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

After the baseline Session Audit report is reviewed, create or update a follow-up Planning Workspace for remediation findings that should become durable work. The workspace should link back to the baseline report, keep Published Issue creation under explicit user approval, separate Firehorse implementation work from possible upstream pi-memory, pi-subagents, or context-mode issues, preserve the baseline's source-priority/snapshot findings, and route memory-runtime replacement or repair work to PRD-0006 or a separately approved upstream/tooling follow-up rather than expanding PRD-0005.

## Acceptance criteria

- [ ] A follow-up Planning Workspace exists only if the reviewed baseline report contains approved remediation candidates.
- [ ] Local Issue Drafts in the follow-up workspace link back to the baseline report and preserve finding fingerprints/evidence summaries.
- [ ] GitHub Published Issues are created only after explicit user approval.
- [ ] Firehorse-owned implementation issues are separated from upstream tooling candidates.
- [ ] Memory-runtime replacement or repair candidates, including `pi-mem` replacement, memory-tool alias cleanup, injection-default changes, and source-mixing fixes, are linked to PRD-0006 or an approved upstream/tooling follow-up, not implemented inside PRD-0005.
- [ ] Follow-up candidates preserve source finding IDs for broad memory injection, repeated memory-block deduplication, stale injected memory guidance, Pi JSONL discovery, source-aware parsing, snapshot cutoffs, memory package/tool provenance, content/source-domain mismatch, setup/version-state drift, direct dependency patching, and tool-warning classification where approved.
- [ ] Watchlist-only findings are not promoted unless repeated across audits or explicitly requested.

## Blocked by

- Draft issue 0009: Baseline Session Audit report for PRD-0005 planning session
