# Scouting Notes

## Existing Firehorse structure

- Canonical Firehorse definitions live under `packages/firehorse-core/definitions/`.
- Workflows project to Pi prompt templates under `packages/firehorse-pi/prompts/firehorse/horse-*.md` and Claude commands under `packages/firehorse-claude/commands/firehorse/horse-*.md`.
- Provider-specific implementation belongs in distribution packages, not in `firehorse-core`.
- Generated mirrors are checked in and validated through `pnpm definitions:check`.
- Hook and extension code is hand-authored distribution code, not generated mirror content.

## Existing hook patterns

### Pi

- `packages/firehorse-pi/extensions/firehorse-update-check.ts` registers a `session_start` handler.
- The extension uses `ctx.ui.notify()` for non-blocking notifications.
- Existing update-check behavior demonstrates:
  - skip flags
  - bounded request timeouts
  - cache/state files
  - graceful no-op behavior
  - silence when there is nothing useful to report

### Claude

- `packages/firehorse-claude/hooks/hooks.json` registers `SessionStart` command hooks.
- `packages/firehorse-claude/hooks/check-update.mjs` demonstrates:
  - `startup|resume` matching
  - timeout configuration
  - `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PLUGIN_DATA` path handling
  - JSON hook output with `systemMessage`, `suppressOutput`, and `hookSpecificOutput.additionalContext`
  - swallowed failures so session startup is not broken

## Expected provider capabilities

### Pi

Firehorse-pi currently bundles or exposes:

- `pi-lens`
- `pi-agent-memory`
- `pi-subagents`
- `pi-web-access`
- Matt Pocock engineering skills, including `improve-codebase-architecture`
- Firehorse-generated prompt templates and skills

The Pi projection for `assess-codebase-health` should strongly direct the agent to use Pi-native code intelligence and memory tools when available.

### Claude

The Claude plugin exposes:

- Firehorse-generated commands/agents/skills
- bundled/marketplace Claude plugin dependencies such as `claude-mem`
- Matt Pocock engineering skills, including `improve-codebase-architecture`
- Claude-native code and search capabilities

The Claude projection should be strong for Claude without referencing Pi-only tools as requirements.

## Codebase-health implementation seams

Likely modules or files to add/modify:

- Canonical workflow definition: `packages/firehorse-core/definitions/workflows/assess-codebase-health.md`.
- Generated mirrors through `pnpm definitions:write`.
- Pure helper code in `firehorse-core` for read-only report parsing/freshness evaluation if it can remain provider-neutral.
- Pi extension: `packages/firehorse-pi/extensions/firehorse-codebase-health.ts`.
- Claude hook script: `packages/firehorse-claude/hooks/check-codebase-health.mjs`.
- Claude hook manifest: `packages/firehorse-claude/hooks/hooks.json`.
- Package manifests exposing the Pi extension and generated workflow mirrors.
- Tests for helper behavior and Claude hook parsing/freshness behavior where feasible.

## Non-goals from scouting

- Do not add a generalized Firehorse runtime, prompt loader, provider transport, or autonomous execution loop.
- Do not make the session-start hook perform deep analysis.
- Do not require GitHub/network access in startup hooks.
- Do not hand-edit generated provider mirrors.
