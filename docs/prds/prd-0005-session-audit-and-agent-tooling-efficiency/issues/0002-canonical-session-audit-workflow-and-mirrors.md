# Canonical `session-audit` Workflow and generated provider mirrors

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Add the canonical `session-audit` Firehorse Workflow definition and generated Pi/Claude `horse-session-audit` provider mirrors. The workflow should be instruction-first, post-hoc, and explicit that it may inspect bounded local session logs and memory/context databases only under the PRD's preview and privacy rules. For Pi sessions it should instruct agents to start from actual Pi JSONL session history before using memory observations or context-mode summaries as corroboration.

## Acceptance criteria

- [ ] A canonical `session-audit` Workflow Definition File validates with the existing Definition Format parser/validator.
- [ ] Pi and Claude generated mirrors expose `horse-session-audit` with deterministic provenance/source-hash metadata.
- [ ] The generated workflow references the experimental helper capabilities from slice 0001 without overpromising unimplemented discovery/classification behavior.
- [ ] Workflow instructions require direct session-history evidence first, describe active-session snapshot cutoffs, and treat memory observations as corroborating evidence.
- [ ] Workflow instructions preserve the no-runtime/no-telemetry boundary and require explicit approval before publishing reports or issues.
- [ ] `pnpm definitions:check` passes or any unrelated pre-existing failure is documented.

## Blocked by

- Draft issue 0001: Experimental helper tracer bullet for explicit Session Evidence
