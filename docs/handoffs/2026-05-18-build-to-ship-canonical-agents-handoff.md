# Handoff: Firehorse Build-to-Ship / Canonical Agents

## Current state

- User asked for a planning/grilling session to improve the Firehorse build workflow around Matt Pocock TDD, canonical worker/reviewer agents, GitHub Projects, and a future ship workflow.
- Do **not** start implementation unless the user explicitly asks. User said they will refresh GitHub Project auth themselves.
- Parent PRD is published:
  - Local: `docs/prds/prd-0004-build-to-ship-workflow-and-canonical-agents/PRD.md`
  - GitHub: https://github.com/cinjoff/firehorse/issues/18
- Child issues are published:
  - #19 Agent projection layout for canonical Agent Roles — `ready-for-agent`, first implementation slice
  - #20 Create canonical worker Agent Role
  - #21 Update build workflow for TDD, worker, reviewer, and GitHub status
  - #22 Add ship workflow for PR, merge, changelog, tag, and release
  - #23 Add Firehorse setup manifest schema and session-start validation
  - #24 Add new-project GitHub repository and Tracker Project setup
- Parent #18 has a comment listing children and noting GitHub Project linking gap.
- GitHub Project linking was not completed because current `gh` auth lacked `read:project`; user will refresh manually.

## Key decisions to preserve

Read `docs/DECISIONS.md`, especially D-138 through D-145:

- D-138: narrow setup runtime + `.firehorse/manifest.json`, read-only by default on session start.
- D-139/D-140: Firehorse owns exposed Agent Roles; `reviewer` subsumes `code-reviewer`; no compatibility alias.
- D-142/D-143/D-144: Agent Role projections use plain provider-native names, compact provenance, canonical source under `packages/firehorse-core/definitions/agents/`, generated to top-level provider agent paths, stale `agents/firehorse/` mirrors removed/failed.
- D-145: Build-to-Ship + canonical agents are one PRD with sliced implementation issues.

Also read `CONTEXT.md` for current glossary: Published Issue, Tracker Project/Status, Firehorse Setup Manifest, Agent Role projection rules.

## Implementation intent when user resumes

Recommended next command when ready: `horse-build #19`.

#19 scope only:

- Move/migrate current Agent Role sources to `packages/firehorse-core/definitions/agents/`.
- Generate provider-native top-level agent outputs, e.g. Claude `packages/firehorse-claude/agents/<id>.md` and Pi top-level sync/package agent sources.
- Remove stale provenanced provider `agents/firehorse/` Agent Role mirrors.
- Update projection tests first (TDD): `definitions/agents/`, top-level outputs, stale mirror cleanup, manifests.
- Preserve `reviewer` and `plan-reviewer` behavior; this is path/projection migration only.
- Avoid `worker`, `build`, `ship`, and `new-project` implementation in #19 except where tests/docs need future-safe references.

## GitHub/Tracker notes

- #19 should remain `ready-for-agent` but not In Progress until implementation actually starts.
- Missing GitHub Project auth/linking is a setup gap, not a blocker for #19.
- After user refreshes auth, add #18–#24 to Tracker Project if available:
  - #18 Backlog/project tracking
  - #19 Ready
  - #20–#24 Backlog

## Suggested skills/tools for next session

- Use `tdd` for #19: update failing tests first, then projection code, then regenerate/check.
- Use `context-mode` for large test/build output.
- Use `lsp-navigation` / `ast-grep` for definition/projection code navigation.
- Use GitHub issue tracker docs/skills only if updating issue comments or project linking.

## Validation expected for #19

- `pnpm definitions:check`
- targeted definition/projection tests
- `pnpm typecheck` if TypeScript projection code changes
- inspect generated manifests and generated agent paths

## Relevant memory observations

If needed, fetch these with pi-mem:

- 7160 / 7161: Agent Role source directory finalized under `definitions/agents/`.
- 7162: GitHub Projects integration decisions in `CONTEXT.md`.
- 7163: D-145 PRD/sliced issue plan.
- 7165–7167: PRD-0004 published as #18 and local PRD updated.
