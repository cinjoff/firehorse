# Outcome, verification, setup, compaction, approval, and privacy findings

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Add Session Audit findings that evaluate whether the session actually satisfied the user's request safely, not just whether it used few tokens. This slice covers post-change verification, setup problems, correction loops, audit-quality correction loops, compaction/handoff continuity, approval-boundary risks, privacy/redaction confidence, excessive effort, and relevant-code discovery wandering.

## Acceptance criteria

- [ ] Edited-code sessions that skip proportional post-change diagnostics/tests can be reported with confidence tied to available evidence.
- [ ] Setup issues such as stale context-mode, missing Bun, memory project drift, manifest/lockfile/active-install/bundled-distribution mismatch, or direct installed-dependency edits produce suggested remediation but never execute repairs without approval.
- [ ] Compaction/handoff loss, post-delivery correction loops, excessive effort, and relevant-code discovery wandering are detectable from fixtures.
- [ ] User corrections that identify a missed primary evidence source are reported as audit-quality/outcome findings and must trigger PRD/issue updates before publication.
- [ ] Approval-sensitive actions such as publishing issues, destructive shell commands, installs/upgrades, direct `node_modules`/installed-dependency patching, secrets/config changes, and tracker mutations are flagged when done without clear current-session approval.
- [ ] Privacy/redaction checks withhold low-confidence excerpts and record redaction notes instead of copying sensitive data into reports.

## Blocked by

- Draft issue 0003: Recent Session Evidence discovery preview
