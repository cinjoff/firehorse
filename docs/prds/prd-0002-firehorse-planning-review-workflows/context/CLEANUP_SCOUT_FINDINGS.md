# Cleanup Scout Findings

Moved from `CONTEXT.md` so the root context can remain the canonical domain glossary and flagged-ambiguities map. Later moved into this PRD-0002 context folder because the scan is transient planning evidence, not a codebase anchor.

Scope: read-only scan for stale references after retiring `.planning/` / root `context-gather/` and consolidating `diagnose-fix` into `fix-bug`.

Resolution status (2026-05-15): addressed. `CONTEXT.md` has been restored as the canonical glossary, closed local issue drafts now carry supersession notes, current manifests expose `horse-fix-bug` and no `horse-diagnose-fix`, stale `horse-diagnostic-reviewer` generated mirrors were removed by `pnpm definitions:write`, and remaining references are historical guardrails or explicit no-alias assertions.

## High

1. `docs/prds/prd-0001-firehorse-definition-format-and-projection/issues/issue-0004-generate-provider-mirrors-for-the-diagnose-fix-workflow.md` (lines 1-17)
   - Active-looking local issue draft is still entirely framed around canonical `diagnose-fix` and generated mirrors for that workflow.
   - This is not just historical prose: it has unchecked acceptance criteria and a published issue link, so future agents may treat it as current work.
   - Cleanup action: close/archive/delete this local draft, or add a clear supersession note pointing to `fix-bug` / PRD-0002.

2. `docs/prds/prd-0001-firehorse-definition-format-and-projection/issues/issue-0007-document-the-definition-format-implementation-and-deferred-workflow-boundaries.md` (lines 15-17)
   - Acceptance criteria still require complete examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`.
   - Current public bug-fix workflow is `fix-bug`; keeping this unchecked criterion may drive agents to recreate old examples.
   - Cleanup action: update criterion to `fix-bug` or mark the issue superseded/completed by the PRD-0002 implementation.

## Medium

1. `docs/handoffs/2026-05-15-firehorse-definition-format-grill-handoff.md` (lines 49-51, 99-105)
   - Handoff says “First Phase 2 fixture remains `diagnose-fix`” and suggested next work still says to draft examples for `diagnose-fix`.
   - This is partly historical, but the “Suggested next work” section is action-oriented and now stale.
   - Cleanup action: add a supersession note near the top or update the action-oriented lines to say PRD-0002 replaced this with `fix-bug`.

2. `docs/prds/prd-0002-firehorse-planning-review-workflows/context/FIREHORSE_COMMON_ARTIFACTS.md` (lines 6-24, 71-79)
   - PRD context still cites deleted paths/artifacts such as `packages/firehorse-core/definitions/workflows/diagnose-fix.md` and `packages/firehorse-pi/prompts/firehorse/horse-diagnose-fix.md`.
   - The document is context/research, but it is titled “Code Context” and reads like current retrieval evidence.
   - Cleanup action: mark these as a pre-rename source snapshot, or update the pattern references to `fix-bug` / `horse-fix-bug` where current-state accuracy matters.

3. `docs/prds/prd-0002-firehorse-planning-review-workflows/context/UPSTREAM_INVENTORY_AND_SYNERGIES.md` (lines 15, 32, 45, 77, 91)
   - Current-sounding inventory says Firehorse exposes `horse-diagnose-fix` and uses deleted `diagnose-fix.md` examples.
   - This is stale after manifests/filesystem moved to `horse-fix-bug`.
   - Cleanup action: refresh the inventory table and synergy cluster, or add a clear “captured before PRD-0002 rename” note.

4. `docs/prds/prd-0002-firehorse-planning-review-workflows/context/FHHS_LEGACY_WORKFLOWS.md` (lines 99-104, 132-135)
   - Mostly intentional historical FHHS research, but two statements are now stale: Firehorse “currently keeps `.planning/` lightweight” and the open question asks how much `.planning/` compatibility is desired.
   - D-136 answers this: repo-local `.planning/` is retired and should not be recreated.
   - Cleanup action: annotate those lines as pre-D-136, or update the question to record that compatibility is currently rejected/deferred.

5. `docs/prds/prd-0001-firehorse-definition-format-and-projection/PRD.md` (lines 13-15, 73-89)
   - PRD-0001 still names `diagnose-fix` as the first complete fixture and example target.
   - This is historical PRD content, so avoid rewriting requirements casually; however, it now conflicts with PRD-0002’s public workflow naming.
   - Cleanup action: add a short supersession note linking to PRD-0002 / `fix-bug`, rather than rewriting the original PRD history.

## Low

1. `docs/prds/prd-0001-firehorse-definition-format-and-projection/context/SKILLS_FRAMEWORK_DISCUSSION_SYNTHESIS.md` (line 486)
   - Historical synthesis checklist includes `firehorse-diagnose-fix` as a candidate workflow.
   - Cleanup action: optional rename to `firehorse-fix-bug` or mark superseded if this synthesis is still used as planning input.

2. `docs/DECISIONS.md` (notably lines 133-136, 926-929, 1708-1772, 1847-1848, 2137-2148, 2311-2339)
   - Contains many `.planning/` and `diagnose-fix` references, but these are intentionally historical append-only decisions.
   - D-136 already supersedes `.planning/` location. The diagnose-fix decisions are historical unless the project wants a central superseding decision for `fix-bug`.
   - Cleanup action: do not rewrite old decisions; optionally append/cross-link a supersession note if agents keep misreading them.

## Verified intentional/current references — no cleanup recommended

- `AGENTS.md`, `CLAUDE.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, and `docs/agent-skills/domain.md` mention `.planning/` as a retirement/guardrail instruction.
- `CONTEXT.md`, PRD-0002 `PRD.md`/`DECISIONS.md`, `docs/FIREHORSE-DEFINITION-FORMAT.md`, `packages/firehorse-core/definitions/workflows/fix-bug.md`, generated `horse-fix-bug` mirrors, and `packages/firehorse-core/src/definitions/definitions.test.ts` mention `diagnose-fix` / `horse-diagnose-fix` to assert replacement or alias absence.
- JSON manifests and TypeScript source do not expose stale `horse-diagnose-fix`; old generated files are deleted and `fix-bug` files exist.
