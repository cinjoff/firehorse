# Baseline Session Audit report for PRD-0005 planning session

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: HITL
Proposed label: ready-for-human

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Run the first helper-backed Session Audit report against the PRD-0005 planning session and recent session evidence, then review the resulting thresholds, redaction choices, and Issue Draft candidate examples. A partial manual pre-helper baseline exists and captured important learnings, but this slice remains human-in-the-loop because it must validate those learnings against helper-produced evidence and may inspect local session and memory evidence.

## Acceptance criteria

- [ ] A timestamped local Session Audit report exists under `docs/audits/session-audit/` with `completeness: partial` or `complete` recorded honestly.
- [ ] The report covers the current PRD-0005 planning session plus discovered recent logs for the latest five main sessions or last seven days where available, starting from actual Pi JSONL session history where Pi evidence exists.
- [ ] The report records a snapshot cutoff with session file/ID, last entry timestamp, entry count, file size, and source hash where practical.
- [ ] The report includes a memory injection timeline for pasted `$CMEM firehorse` blocks with observation counts, token ranges, relevance notes, representative IDs, and source-aware separation of actual injections from derived echoes.
- [ ] The report includes a session learnings section and verifies that PRD/issues reflect those learnings before publication.
- [ ] A human reviews redaction/privacy risk and decides whether any redacted report artifact may be committed with `git add -f`.
- [ ] Thresholds and implementation issue drafts are updated if the baseline evidence shows they are too noisy or too weak.

## Blocked by

- Draft issue 0008: Full finding model and Issue Draft candidate report contract
