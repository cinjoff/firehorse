# Firehorse handoff — Definition Format + new-project grill

## Purpose

This handoff is for a fresh agent continuing Firehorse after a long `grill-with-docs` session. It is a navigation guide only. The authoritative content is in the repository artifacts referenced below, especially `.planning/DECISIONS.md` and `CONTEXT.md`.

## Must-read artifacts

Read these first, in this order:

1. `AGENTS.md` — repo rules and hard boundaries. Note that Phase 2 may add definition schema/parser/validator and build-time projection code, but still no runtime/prompt loader/execution engine.
2. `CONTEXT.md` — glossary and resolved language. Pay special attention to Workflow, Skill, Agent Role, Firehorse Definition Format, Generated Mirror, Project Anchor, Codebase Map, PRD Draft, and Issue Draft.
3. `.planning/STATE.md`, `.planning/ROADMAP.md`, `.planning/REQUIREMENTS.md`, `.planning/DECISIONS.md` — roadmap and binding decisions. Do not relitigate decisions unless explicitly asked.
4. `docs/ARCHITECTURE.md` — architecture text now reflects definition/projection and `horse-new-project` direction.
5. `docs/SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md` — source synthesis that the grill was based on.

## What happened in this session

- The earlier Definition Format grill continued and expanded into projection-generator details.
- The user then asked to adapt `cinjoff/fhhs-skills` `fh:new-project` into Firehorse, without GSD, and with durable project/codebase documents.
- I fetched/read the original upstream `fh:new-project` skill and local Matt Pocock `to-prd`, `to-issues`, and `setup-matt-pocock-skills` references.
- I updated `CONTEXT.md`, `docs/ARCHITECTURE.md`, `.planning/REQUIREMENTS.md`, and `.planning/DECISIONS.md` throughout.
- The decision log was checked after the updates: no duplicate decision IDs, no gaps, last decision is D-129.

## Current decision map

Use `.planning/DECISIONS.md` for full rationale. Relevant ranges:

- **Definition Format core model:** D-22 through D-45.
- **Projection/generation:** D-46 through D-55, D-59 through D-64, D-71 through D-75, D-81 through D-85, D-103 through D-107.
- **Initial `diagnose-fix` fixture:** D-49, D-98 through D-102.
- **`horse-new-project` / `horse-map-codebase`:** D-56 through D-58, D-65 through D-70, D-76 through D-80, D-86 through D-97, D-108 through D-129.

Watch supersession notes inside `.planning/DECISIONS.md`. In particular:

- D-86 supersedes the earlier plan to hand-author provider-native `horse-new-project` skills first. `horse-new-project` and `horse-map-codebase` should wait for the Definition Format projection generator.
- D-78 supersedes the setup-suggestion-only boundary: full starter/Vercel/Supabase/dependency automation is allowed with explicit opt-in and per-command confirmation, but no Sentry/observability setup.
- D-80 supersedes the stronger GitHub requirement: missing `gh` blocks issue creation, not project-anchor writing.

## Settled Definition Format direction

Do not duplicate the full spec here. Summary for orientation:

- Canonical definitions live under `packages/firehorse-core/definitions/{workflows,skills,agent-roles}/`.
- Files are Markdown with gray-matter frontmatter and Zod validation.
- Phase 2 includes schema/parser/validator, pure projection helpers, repo scripts, generated mirrors, manifest updates, and freshness checks.
- No Firehorse runtime, prompt loader, slash-command runtime, provider transport, or execution engine.
- Generated mirrors are checked in, deterministic, provenance-marked, content-hashed, manifest-exposed, and not hand-editable.
- Workflows project to Pi prompt templates and Claude commands; skills to provider skill surfaces; Agent Roles to Claude agents and Pi subagent files synced by explicit setup.
- First Phase 2 fixture remains `diagnose-fix`, with `feedback-loop`, `diagnostic-reviewer`, and upstream `mattpocock-skills` `diagnose`.

## Settled `horse-new-project` / `horse-map-codebase` direction

Do not implement these as hand-authored provider-native skills before the generator. They are planned under REQ-09 after the Definition Format/projection path exists.

Core behavior:

- Native invocation name: `horse-new-project`; future canonical workflow ID: `new-project`.
- No GSD, no `.planning/`, no Sentry/observability setup.
- Creates/syncs durable anchors under `docs/`:
  - `docs/PROJECT.md` — evergreen high-level product context.
  - `docs/DESIGN.md` — only when real design language is defined, preferably via bundled `impeccable`.
  - `docs/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING,INTEGRATIONS,CONCERNS}.md` — only after real code exists, with freshness metadata.
- Updates only a marked Firehorse section in `AGENTS.md`.
- Brownfield mode analyzes code before asking and uses reusable `horse-map-codebase` behavior.
- Product discovery is medium-depth, one question at a time, with recommended answers.
- Starter setup uses `cinjoff/fh-starter-project`, private by default, preserves existing repo files, and uses a temp checkout + conflict report for overlays.
- Before external mutations, ask per-command confirmation.
- Before issue drafting, run/use `setup-matt-pocock-skills`; draft via `to-prd` / `to-issues` patterns without copying their templates.
- Local drafts are written before GitHub mutation and retained after publishing with links:
  - `docs/prds/prd-0001-{slug}.md`
  - `docs/issues/issue-0001-{slug}.md`
- Proposed issues include setup/infrastructure tasks plus product vertical slices, labels, and an `MVP` milestone. Issue creation requires approval and working `gh` auth.

## Synthesis coverage check

I checked this handoff against `docs/SKILLS-FRAMEWORK-DISCUSSION-SYNTHESIS.md`.

Relevant synthesis themes are now represented by artifacts rather than copied here:

- **Long-lived project knowledge anchors** → `CONTEXT.md`, `docs/ARCHITECTURE.md`, REQ-09, D-58, D-108 through D-129.
- **Workflow composition over raw skills** → Definition Format decisions and projection model in D-22 through D-55.
- **Product idea → PRD → issues** → `horse-new-project` decisions D-95, D-112, D-119 through D-126.
- **Orient/map codebase** → `horse-map-codebase` decisions D-77, D-90, D-110, D-116, D-129.
- **Diagnose/fix** → initial Phase 2 fixture decisions D-49 and D-98 through D-102.
- **Frontend design/UX pass** → Impeccable use/defer decisions D-76 and D-109.
- **Matt Pocock skill integration** → setup/to-prd/to-issues decisions D-95, D-119, D-125.
- **Cross-provider parity and provider-native surfaces** → projection decisions in `.planning/DECISIONS.md` and architecture docs.
- **Autonomous loops** remain deferred; do not implement them unless explicitly scoped later.

## Suggested next work

If continuing design/grill:

1. Resolve remaining `schemaVersion: 1` frontmatter fields per definition kind.
2. Confirm exact generated mirror paths and manifest mutation details if not already sufficient from decisions.

If moving to implementation:

1. Draft `docs/FIREHORSE-DEFINITION-FORMAT.md` from decisions, with complete examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`.
2. Add `gray-matter` and `zod` to `packages/firehorse-core` dependencies.
3. Add canonical example definitions under `packages/firehorse-core/definitions/`.
4. Implement schema/parser/validator APIs in `firehorse-core`.
5. Implement pure projection helpers in `firehorse-core`; keep filesystem writes in repo scripts.
6. Add `definitions:write` and `definitions:check`; wire check into root `typecheck`.
7. Generate mirrors/manifests and verify freshness checks.
8. Run `pnpm typecheck`, `pnpm build`, and tests.

## Guardrails

- Inspect `git status --short` before editing; this branch has many uncommitted changes.
- Do not add runtime, prompt loader, slash-command runtime, provider transport, autonomous loop, or execution engine.
- Do not normalize upstream skills into Firehorse strict skill definitions.
- Do not hand-edit generated mirrors; change canonical definitions and regenerate.
- Projection writes may overwrite/delete only files with valid Firehorse provenance.
- Keep `.planning/DECISIONS.md` append-only; if changing direction, add a superseding decision.

## Suggested skills for next session

- `grill-with-docs` — continue schema/new-project design decisions against docs.
- `fh-plan-work` — turn the settled decisions into a concrete implementation plan.
- `fh-build` — implement once the plan is clear.
- `tdd` — schema/parser/projection tests.
- `context-mode` — large outputs, test/build logs, git diffs.
- `ast-grep` and `lsp-navigation` — code intelligence during implementation.
- `firecrawl` — only if more upstream docs/web references are needed.
- Later for `horse-new-project`: `impeccable`, `setup-matt-pocock-skills`, `to-prd`, and `to-issues` are relevant bundled behaviors.
