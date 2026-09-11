# Firehorse memory lifecycle capture and injection

Published issue: https://github.com/cinjoff/firehorse/issues/28
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Connect Pi session lifecycle events to the existing claude-mem worker so Firehorse Pi sessions are captured, summarized, completed, and injected with project-scoped prior context. This slice should keep the wrapper thin, preserve historical observation content, and replace stale upstream injected guidance with Firehorse-owned `mem_` guidance.

## Acceptance criteria

- [ ] Session start initializes a Firehorse content session ID using the resolved project and records enough state for status/debugging.
- [ ] Before agent start registers the prompt with `/api/sessions/init` using `platformSource: "firehorse-pi"`.
- [ ] Tool results are captured to `/api/sessions/observations` by default, skip all Firehorse/claude-mem memory tools, truncate responses, and can be disabled with `FIREHORSE_MEM_CAPTURE=0`.
- [ ] Context injection is enabled by default, scoped to the resolved project, capped to 20 observations by default, and controlled by `FIREHORSE_MEM_INJECT=0|1`, `FIREHORSE_MEM_INJECT_MAX_OBSERVATIONS`, and optional `FIREHORSE_MEM_INJECT_MAX_TOKENS`.
- [ ] Injected context is wrapped in `<firehorse-mem-context>`, not `<pi-mem-context>`.
- [ ] Injected headers/footers are Firehorse-owned, include an IMPORTANT `mem_search` → `mem_timeline` → `mem_get_observations` workflow reminder, and warn that memory may be stale and must be verified against live files/docs.
- [ ] Stored observation content is preserved as historical memory; the wrapper does not mutate or semantically filter stale observations in v1.
- [ ] Agent end summarizes and completes the worker session, preserving in-flight observation timing behavior.
- [ ] `/mem-status` reports last injection project, observation count, size, and limit metadata; raw context is shown only with `--raw-context` or future explicit debug command.

## Blocked by

- `0001-helper-project-and-worker-discovery.md`
- `0002-firehorse-mem-progressive-tools.md`
