# Tool-choice and subagent efficiency findings

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Add candidate finding detection for context-mode, pi-lens, memory smart tool, and pi-subagents orchestration behavior. The report should distinguish tool misuse from justified exceptions, highlight efficient positive patterns, and route long evidence into artifacts rather than flooding the parent session.

## Acceptance criteria

- [ ] The audit can flag large-output handling issues, underuse of `ctx_batch_execute`, context-mode misuse for live code intelligence, and stale memory facts used without live verification.
- [ ] The audit can flag repeated subagent status polling, async/foreground mismatches, implementation workers that only advise instead of editing or returning `BLOCKED`, large inline subagent output, duplicate subagent work, and conflicting advice.
- [ ] The audit can produce positive findings for good batching, scoped memory use, LSP-first navigation, artifact routing, verification loops, and context savings.
- [ ] The audit parses tool-result warning banners such as `BLIND WRITE`, `THRASHING`, and unavailable Pi-lens analysis, then classifies them with nuance rather than treating every warning as a failure.
- [ ] Findings include severity, confidence, evidence, recommendation, and intentional-exception support.
- [ ] Fixture tests cover each tool family signal and at least one justified intentional exception.

## Blocked by

- Draft issue 0003: Recent Session Evidence discovery preview
