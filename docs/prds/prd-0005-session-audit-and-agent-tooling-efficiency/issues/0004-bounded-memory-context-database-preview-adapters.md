# Bounded memory/context database preview adapters

Draft status: local issue draft; do not publish until the PRD-0005 baseline Session Audit report is reviewed.
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0005-session-audit-and-agent-tooling-efficiency/PRD.md`

## What to build

Add read-only preview adapters for known pi-memory/claude-mem and context-mode databases. The adapters should resolve paths through explicit options, environment/settings or Firehorse Setup Manifest data, then known defaults; inspect only metadata before approval; dynamically load SQLite support; report active memory package/tool/config provenance; and enforce hard caps and schema-drift handling. This slice is report-only: it must not install packages, change MCP/tool aliases, update memory injection defaults, or mutate memory/context databases.

## Acceptance criteria

- [ ] Database path resolution follows the PRD priority order and reports skipped sources as completeness notes.
- [ ] SQLite capabilities are loaded optionally/dynamically, with no top-level `bun:sqlite` or runtime-specific imports in `firehorse-core`.
- [ ] Preview mode inspects existence, schema compatibility, row counts, candidate windows, active package/tool/config source, and paths without reading observation contents.
- [ ] Adapters report whether memory evidence comes from Firehorse-bundled `pi-agent-memory`/`claude-mem`, a user/global install, or a self-adapted MCP surface before suggesting setup remediation.
- [ ] Adapters enforce read-only access where supported and hard caps for sessions, rows, snippets, and bytes.
- [ ] Fixture SQLite tests cover documented tables, schema drift, no-adapter behavior, read-only behavior, package/tool provenance reporting, cap-triggered partial completeness, and no runtime/config mutation.

## Blocked by

- Draft issue 0001: Experimental helper tracer bullet for explicit Session Evidence
- Draft issue 0002: Canonical `session-audit` Workflow and generated provider mirrors
