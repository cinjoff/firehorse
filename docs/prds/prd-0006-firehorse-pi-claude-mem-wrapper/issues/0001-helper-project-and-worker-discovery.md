# Helper tracer bullet for project and worker discovery

Published issue: https://github.com/cinjoff/firehorse/issues/26
Status: open
Type: AFK
Proposed label: ready-for-agent

## Parent

`docs/prds/prd-0006-firehorse-pi-claude-mem-wrapper/PRD.md`

## What to build

Add the smallest testable helper layer that resolves the Firehorse memory project and discovers an existing claude-mem worker without side effects. This slice should prove the setup-manifest-first project identity contract, worker host/port discovery, canonical `/api/health` status probing, and missing-worker diagnostics before any memory tools or lifecycle capture are added.

## Acceptance criteria

- [ ] Project resolution prefers `.firehorse/manifest.json` `memory.project`, then `github.repo`, then `project.name`, then side-effect-free GitHub remote metadata, then explicit env fallback.
- [ ] Manifest identity wins over normal env fallback unless an explicit override such as `FIREHORSE_MEMORY_PROJECT_OVERRIDE=1` is set.
- [ ] Resolution does not shell out, hit the network, write files, or infer from Superset/Conductor worktree path basenames.
- [ ] Worker discovery reads `CLAUDE_MEM_HOST` / `CLAUDE_MEM_PORT`, compatible worker env vars, and claude-mem `settings.json`, then defaults to `127.0.0.1:37777`.
- [ ] Worker health uses canonical `/api/health`; no undocumented `/health` fallback is added.
- [ ] Missing/unreachable worker diagnostics tell users to install/start claude-mem and do not auto-install or auto-start anything.
- [ ] Unit tests cover manifest, worktree `.git`, remote config, env override/fallback, settings-file, default, and missing-worker cases.

## Blocked by

None - can start immediately
