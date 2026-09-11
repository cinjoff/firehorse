# Packaging and dependency migration for Firehorse mem

Published issue: https://github.com/cinjoff/firehorse/issues/29
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Migrate Firehorse Pi packaging from upstream `pi-agent-memory` and Firehorse's worker auto-start helper to the new first-party `firehorse-mem` wrapper. This slice should ensure users get only the Firehorse-owned memory surface and that package manifests, bundled dependencies, notices, and install paths match the new ownership model.

## Acceptance criteria

- [ ] Firehorse Pi manifests no longer expose `./node_modules/pi-agent-memory/extensions` or `./node_modules/pi-agent-memory/skills/mem-search`.
- [ ] `pi-agent-memory` is removed from root workspace dependencies, Firehorse Pi dependencies, bundled dependencies, lockfile, and third-party notices when no Firehorse code imports it.
- [ ] `firehorse-memory-project.ts` is retired because project resolution is owned by `firehorse-mem.ts`.
- [ ] `firehorse-claude-mem-worker.ts` is retired because Firehorse no longer auto-starts or owns the claude-mem worker.
- [ ] `claude-mem` bundling is removed unless implementation proves Firehorse imports worker scripts; otherwise setup docs cover installing/starting claude-mem externally.
- [ ] Pi package and repo-root install manifests expose the new Firehorse memory extension and Firehorse-owned `mem` skill.
- [ ] Release/update metadata and third-party notices are updated consistently with the dependency changes.
- [ ] `pnpm definitions:check`, package typecheck, and relevant upstream/package checks pass or document any accepted no-op.

## Blocked by

- `0002-firehorse-mem-progressive-tools.md`
- `0003-memory-lifecycle-capture-and-injection.md`
