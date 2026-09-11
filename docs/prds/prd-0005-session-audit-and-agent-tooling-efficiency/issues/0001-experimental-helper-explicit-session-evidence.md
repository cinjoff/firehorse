# Experimental helper tracer bullet for explicit Session Evidence

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Add the smallest experimental `firehorse/session-audit` helper path that can turn explicit user-provided Session Evidence into a redacted, provenance-marked Session Audit report draft. This slice should prove the helper export, typed report data, evidence source-kind/priority metadata, snapshot cutoff metadata, redaction/hashing behavior, filename/frontmatter generation, and report rendering without adding a CLI or broad evidence discovery.

## Acceptance criteria

- [ ] `firehorse/session-audit` is exported as experimental from `firehorse-core` without introducing runtime-specific top-level imports.
- [ ] The helper can render a Session Audit Markdown report from explicit pasted evidence using local timestamped filenames and ISO UTC frontmatter metadata.
- [ ] Report data can record evidence source kind and priority, whether a source is direct/corroborating/derived, and a snapshot cutoff for active-session evidence.
- [ ] Redaction and hashing helpers fail closed by withholding excerpts when confidence is low and never persist raw transcript or memory content by default.
- [ ] `docs/audits/session-audit/.gitignore` ignores generated `.md` and `.json` reports by default.
- [ ] Tests cover the helper API shape, report frontmatter/filename behavior, redaction/hashing, and no raw excerpt persistence.

## Blocked by

None - can start immediately
