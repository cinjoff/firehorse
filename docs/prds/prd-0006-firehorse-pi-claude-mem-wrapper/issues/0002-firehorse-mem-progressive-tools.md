# Firehorse mem progressive tools

Published issue: https://github.com/cinjoff/firehorse/issues/27
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Add the Firehorse-owned Pi memory tool surface that wraps the existing claude-mem worker's progressive discovery endpoints. This slice should make `mem_search`, `mem_timeline`, `mem_get_observations`, and `/mem-status` available with Firehorse project defaults, while deliberately not exposing `memory_recall` or server-beta write/generation tools.

## Acceptance criteria

- [ ] Pi registers `mem_search`, `mem_timeline`, and `mem_get_observations` from the Firehorse package without the old claude-mem MCP bridge.
- [ ] `mem_search` calls the worker search endpoint, mirrors claude-mem MCP parameters exactly, and defaults `limit` to `20`.
- [ ] `mem_timeline` calls the worker timeline endpoint and mirrors `anchor`, `query`, `depth_before`, `depth_after`, and `project`.
- [ ] `mem_get_observations` calls `/api/observations/batch`, requires `ids`, and caps batches to 10 IDs by default.
- [ ] All tools default `project` to the resolved Firehorse memory project and allow deliberate cross-project lookup only through an explicit `project` parameter.
- [ ] Tool output preserves worker formatting up to `FIREHORSE_MEM_TOOL_MAX_CHARS` and adds only wrapper errors or project/default metadata.
- [ ] `memory_recall`, generic `search`/`timeline`/`get_observations`, and server-beta write/generation tools are not registered.
- [ ] `/mem-status` reports worker health, resolved project, discovery source, and current session metadata without dumping raw context unless requested.

## Blocked by

- `0001-helper-project-and-worker-discovery.md`
