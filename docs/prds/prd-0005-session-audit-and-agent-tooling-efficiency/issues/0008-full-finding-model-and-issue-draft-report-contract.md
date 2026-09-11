# Full finding model and Issue Draft candidate report contract

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Complete the Session Audit report contract for stable findings, deterministic fingerprints, Codebase Health-style severity, snapshot statuses, confidence, evidence-source priority, active-session snapshot cutoffs, session learnings, positive findings, intentional exceptions, recommendations, JSON sidecars, and local Issue Draft candidate sections. This slice turns the earlier signal detectors into a coherent immutable report artifact.

## Acceptance criteria

- [ ] Findings have stable deterministic fingerprints based on category, normalized signal key, source project/session, and affected tool family.
- [ ] Reports support Critical, High-leverage, and Watchlist severity; confirmed, likely, and needs-more-evidence confidence; and the PRD's immutable snapshot status vocabulary.
- [ ] Reports include evidence-source priority, active-session snapshot cutoff metadata, and session learnings when the audit changes requirements or issue scope.
- [ ] Reports separate immutable snapshot findings from post-cutoff remediation/follow-up evidence, including setup/version-state changes.
- [ ] Reports distinguish direct evidence, corroborating memory/context evidence, injected wrapper guidance, and derived echoes so findings cite the right source kind.
- [ ] Reports separate injection-event counts from distinct observation IDs/fingerprints, so repeated memory blocks do not inflate evidence strength.
- [ ] Reported memory findings can recommend routing, but they do not imply Session Audit should repair memory retrieval APIs, compatibility aliases, injection defaults, query filtering, or source-mixing behavior.
- [ ] Critical and High-leverage findings become Issue Draft candidates by default; Watchlist findings do not unless repeated across audits or explicitly requested.
- [ ] Optional JSON sidecars contain deterministic metrics, hashes, redacted snippets only when safe, and withheld markers, but no raw excerpts.
- [ ] Tests cover candidate defaults, Watchlist exclusion, stable fingerprints, positive findings, intentional exceptions, partial completeness, and JSON sidecar restrictions.

## Blocked by

- Draft issue 0005: Same-session memory observation attribution
- Draft issue 0006: Tool-choice and subagent efficiency findings
- Draft issue 0007: Outcome, verification, setup, compaction, approval, and privacy findings
