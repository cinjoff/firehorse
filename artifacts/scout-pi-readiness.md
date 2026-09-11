# Code Context

## Files Retrieved

1. `packages/firehorse-pi/package.json` (lines 28-134, 168-263) - Pi package file allowlist, bundled dependencies, `pi` manifest, and embedded update manifest.
2. `package.json` (lines 22-85, 88-120) - repo-root Pi manifest mirror and definition scripts.
3. `scripts/definitions.ts` (lines 28-35, 49-64, 137-183, 221-251) - generated target directories, definitions check/write flow, manifest sync.
4. `packages/firehorse-core/src/definitions/projection.ts` (lines 49-139, 148-231, 257-281) - `horse-*` naming, workflow/skill/agent projection paths, provenance rendering.
5. `packages/firehorse-core/src/definitions/manifests.ts` (lines 13-69) - generated Pi manifest entry construction and merge behavior.
6. `packages/firehorse-core/definitions/workflows/{create-plan,plan-review,build,review-code,fix-bug}.md` (lines 1-45 each) - canonical workflow IDs and supporting skills/agent roles.
7. `packages/firehorse-pi/prompts/firehorse/{horse-create-plan,horse-plan-review,horse-build,horse-review-code,horse-fix-bug}.md` (lines 1-24 each) - generated Pi workflow prompt headers/provenance.
8. `packages/firehorse-pi/skills/firehorse/{verification-contract,feedback-loop}/SKILL.md` (lines 1-24 each) - generated Pi Firehorse skill headers/provenance.
9. `packages/firehorse-pi/agents/{worker,reviewer,plan-reviewer}.md` (lines 1-24 each) - generated Pi agent-role mirror headers/provenance.
10. `packages/firehorse-pi/firehorse.update.json` (lines 1-105) - update/provenance manifest and bundled package versions.
11. `packages/firehorse-pi/firehorse.subagents.json` (lines 1-127) - default overrides for bundled `pi-subagents` built-in agents.
12. `packages/firehorse-core/upstreams/pi-subagents/UPSTREAM.json` (lines 1-77) - pinned upstream agent set and Pi runtime paths.
13. `node_modules/pi-subagents/src/agents/agents.ts` (lines 723-750) - runtime discovery paths for built-in/user/project agents.
14. `packages/firehorse-pi/README.md` (lines 160-222) - documented upstream mirroring and Pi package surface model.

## Key Code

- Projection is active and fresh: `pnpm definitions:check` reports `validated 13 definitions, 26 generated mirrors, and manifests`.
- `nativeName(id)` renders workflow prompt names as `horse-${id}` (`projection.ts` line 49). Workflows project to `packages/firehorse-pi/prompts/firehorse/${name}.md`; skills to `packages/firehorse-pi/skills/firehorse/<id>/SKILL.md`; agent roles to `packages/firehorse-pi/agents/<id>.md`.
- Generated Pi workflow prompts present and in `pi.prompts`: `horse-create-plan`, `horse-plan-review`, `horse-build`, `horse-review-code`, `horse-fix-bug`, plus `horse-new-project`, `horse-ship`, `horse-update-upstreams`.
- Legacy exact names are not present: no `plan-work`, raw `review`, or raw `fix`. Current equivalents are `create-plan`, `review-code`, and `fix-bug`, exposed as `horse-create-plan`, `horse-review-code`, and `horse-fix-bug`.
- Generated Firehorse Pi skills are only `feedback-loop` and `verification-contract`; build/review/fix are prompts/workflows, not Pi skills.
- `packages/firehorse-pi/package.json` includes `extensions`, `skills`, `prompts`, `themes`, manifests, and `agents` in `files`; `pi` exposes `extensions`, `skills`, `prompts`, and `themes`, but no `pi.agents` key.
- Pi agent-role mirrors (`worker`, `reviewer`, `plan-reviewer`) are generated and included as package files, but `pi-subagents` runtime discovery loads built-ins from `node_modules/pi-subagents/agents` plus user/project agent dirs, not `firehorse-pi/agents` (`node_modules/pi-subagents/src/agents/agents.ts` lines 723-750). Firehorse currently customizes built-in agents through `firehorse.subagents.json`; `plan-reviewer` has no matching upstream built-in in the pinned `pi-subagents` set.
- `npm pack --dry-run --json` from `packages/firehorse-pi` succeeded and included required prompt/skill/agent files and manifests, but reported `fileCount=84300`, `size=100528701`, `unpackedSize=510241399`; 83,028 entries came from `../../node_modules/.pnpm/...` due bundled pnpm symlink targets.
- Local bundled dependency mismatch: `packages/firehorse-pi/package.json` and `firehorse.update.json` declare `context-mode` `1.0.146`, while current `packages/firehorse-pi/node_modules/context-mode/package.json` is `1.0.135`. A local pack now would bundle stale `context-mode` unless dependencies are refreshed.

## Architecture

Canonical definitions live in `packages/firehorse-core/definitions`. `scripts/definitions.ts` loads them, validates upstream skill references, calls `projectDefinitions`, writes provider-native mirrors into `packages/firehorse-pi` and `packages/firehorse-claude`, and merges generated paths into package/plugin manifests. Pi consumes workflow definitions as prompt templates, Firehorse-authored skills as `SKILL.md` directories, and bundled upstream packages through explicit `node_modules/...` manifest paths. Subagent execution is provided by bundled `pi-subagents`; Firehorse applies default overrides to its built-in agents at session start rather than clearly registering generated `packages/firehorse-pi/agents/*.md` as package agents.

## Start Here

Start with `packages/firehorse-pi/package.json`: it is the installability source of truth for what Pi sees. Then inspect `scripts/definitions.ts` and `packages/firehorse-core/src/definitions/projection.ts` to change generated names/paths or manifest wiring.
