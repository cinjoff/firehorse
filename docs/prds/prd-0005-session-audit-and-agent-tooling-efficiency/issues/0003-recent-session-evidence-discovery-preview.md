# Recent Session Evidence discovery preview

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Teach Session Audit to discover recent local Session Evidence from known provider/session locations and present a bounded preview before deeper inspection. Pi JSONL session files under `~/.pi/agent/sessions/--<cwd with / replaced by ->--/*.jsonl` are the primary source for Pi session history. The slice should find the latest five main sessions or last seven days, include nested delegated/subagent `run-*/session.jsonl` files without counting them as main sessions, avoid broad home-directory scans, and record completeness gaps when evidence is missing.

## Acceptance criteria

- [ ] Evidence discovery inspects only known provider/session locations, explicit user paths, or repo-scoped artifacts; it does not follow symlinks or perform broad home-directory transcript search by default.
- [ ] Pi discovery derives the cwd-encoded session directory (`~/.pi/agent/sessions/--<cwd with / replaced by ->--/`) and parses JSONL headers/metadata as primary Pi evidence.
- [ ] The default source window is latest five main sessions or seven days, whichever is smaller, with linked/nested subagent sessions included separately.
- [ ] The preview reports candidate paths/session IDs, source types, providers, timestamps, last entry timestamp, entry count, file size, source hash where practical, message counts, tool counts, usage/cost metadata, and completeness without dumping raw transcript contents.
- [ ] Discovery distinguishes direct main sessions, nested delegated/subagent runs, and derived/generated artifacts so generated report/search echoes are not counted as fresh transcript evidence.
- [ ] Missing local logs degrade to completeness notes instead of hard failures.
- [ ] Fixture tests cover Pi JSONL tree sessions, cwd path encoding, nested `run-*/session.jsonl` files, Claude logs best-effort behavior, missing logs, and rejected broad-search inputs.

## Blocked by

- Draft issue 0001: Experimental helper tracer bullet for explicit Session Evidence
- Draft issue 0002: Canonical `session-audit` Workflow and generated provider mirrors
