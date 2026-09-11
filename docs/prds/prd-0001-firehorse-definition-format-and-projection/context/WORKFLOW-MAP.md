# Firehorse workflow map

> **Placement/status:** This is PRD-0001 context that used to live as a floating
> root `docs/WORKFLOW-MAP.md`. It is a historical capability-grouping snapshot,
> not the current roadmap or source of truth for shipped workflow surfaces. For
> current canonical workflows, read `packages/firehorse-core/definitions/workflows/`;
> for current architecture, read `docs/ARCHITECTURE.md`.

This document groups the bundled Firehorse skills, extensions, and subagents by
what a user is trying to accomplish. The goal is to make Firehorse feel like a
set of end-to-end workflows rather than a bag of individual skill names.

Inputs used for this map:

- Local `SKILL.md` files bundled in `firehorse-pi` / mirrored into
  `firehorse-claude`.
- Shared `pi-subagents` role definitions.
- Firecrawl-indexed upstream docs for `context-mode`, `pi-lens`,
  `pi-mcp-adapter`, `pi-mermaid`, `pi-subagents`, `pi-web-access`,
  `mattpocock/skills`, `pbakaus/impeccable`, and `shadcn/ui`.

## Inventory by capability

### Context, memory, and large-output handling

- `context-mode` — use sandboxed processing, FTS/search, and batched command
  execution instead of flooding the model context with large outputs.
- `ctx-doctor` — diagnose context-mode setup/runtime issues.
- `ctx-insight` — open context-mode analytics.
- `ctx-stats` — show context savings.

### Code intelligence

- `ast-grep` — structural code search and rewrite.
- `lsp-navigation` — definitions, references, hover, diagnostics,
  implementations, signatures, and call hierarchy.
- `pi-lens` direct tools — `ast_grep_search`, `ast_grep_replace`,
  `lsp_diagnostics`, `lsp_navigation`.

### Web, library, and external research

- `librarian` — evidence-backed open-source library research with source links.
- `pi-web-access` direct tools — web search, URL fetch/content extraction,
  GitHub repo reading, PDF/content handling, YouTube/video-aware fetching.

### Delegation and multi-agent orchestration

- `pi-subagents` — delegate to built-in or custom agents, chains, parallel
  fan-out, async/background runs, forked context, and intercom workflows.
- `context-builder` agent — produce compact context and meta-prompts.
- `delegate` agent — direct bounded delegated tasks.
- `oracle` agent — protect decisions and prevent drift.
- `planner` agent — produce implementation plans.
- `researcher` agent — search and synthesize research briefs.
- `reviewer` agent — review code, plans, architecture, PRs, and issues.
- `scout` agent — fast codebase reconnaissance.
- `worker` agent — implementation work.

### Engineering workflows

- `diagnose` — reproduce, minimize, hypothesize, instrument, fix,
  regression-test.
- `tdd` — red/green/refactor development.
- `improve-codebase-architecture` — find deeper refactoring and architecture
  opportunities.
- `zoom-out` — ask for a higher-level map of an unfamiliar code area.
- `prototype` — throwaway prototype for state/business logic or UI variation.

### Product, planning, and issue workflow

- `grill-me` — interview the user until the design/plan is clear.
- `grill-with-docs` — stress-test a plan against `CONTEXT.md` and ADRs.
- `to-prd` — turn conversation context into a PRD.
- `to-issues` — break a plan/spec into independently grabbable issues.
- `triage` — move issues through a triage state machine.
- `setup-matt-pocock-skills` — configure issue tracker, triage labels, and
  domain-doc layout used by the Matt Pocock skills.

### Frontend design

- `impeccable` — frontend design, critique, audit, polish, accessibility,
  motion, UX writing, responsive behavior, and design-system craft.
- `shadcn` — shadcn/ui project context, component docs, registry search,
  component installation/update workflows, composition rules, and preset
  handling.

### Communication, handoff, and skill authoring

- `handoff` — compact a conversation for another agent.
- `caveman` — ultra-compressed communication mode.
- `write-a-skill` — create new Agent Skills.

### Setup and infrastructure

- `firehorse-setup` — first-time setup, Superset detection, user-global
  Superset MCP configuration, and secret-safety checks.
- `pi-mcp-adapter` — MCP proxy infrastructure for Pi.
- `pi-mermaid` — render Mermaid diagrams as ASCII in the Pi TUI.
- `firehorse-release` — repo-local release workflow skill for this repository.

## Workflow groups

### 1. First-time setup and project readiness

**User intent:** “Install Firehorse and make this repo ready for agent work.”

Use together:

1. `firehorse-setup` checks the Firehorse/Pi setup and configures Superset MCP
   safely when applicable.
2. `setup-matt-pocock-skills` records issue tracker, triage labels, and domain
   docs so planning/triage skills know the repo's conventions.
3. `ctx-doctor` verifies context-mode if large-output tooling seems broken.
4. `pi-mcp-adapter` supplies the MCP bridge, but usually stays invisible to the
   user.

Composite opportunity: `firehorse-ready` — a single setup audit skill that runs
Firehorse setup checks, Matt Pocock skill setup checks, context-mode health, and
MCP availability.

### 2. Orient in an unfamiliar codebase

**User intent:** “What is this repo/area and where should I start?”

Use together:

1. `scout` performs fast codebase reconnaissance.
2. `context-builder` turns findings into compact context for the next agent.
3. `zoom-out` asks for the next abstraction level and project-domain framing.
4. `lsp-navigation` and `ast-grep` find definitions, references, call paths, and
   structural patterns.
5. `context-mode` indexes large file lists, dependency output, logs, and search
   results without flooding the conversation.
6. `librarian` checks external library behavior when the code depends on
   unfamiliar packages.

Composite opportunity: `firehorse-orient` — map the code area, summarize domain
language, identify important modules/callers, and produce a compact handoff.

### 3. Research a technical decision

**User intent:** “Which library/API/pattern should we use, and why?”

Use together:

1. `librarian` researches library internals with source links.
2. `pi-web-access` direct tools fetch docs, GitHub repos, PDFs, and videos.
3. `researcher` subagent performs broader web/library investigation.
4. `context-mode` indexes fetched docs and lets the main agent search only the
   relevant sections.
5. `oracle` checks whether the recommendation conflicts with previous decisions.

Composite opportunity: `firehorse-research-brief` — gather docs, compare
options, cite sources, and return a decision-ready brief.

### 4. Stress-test a plan before implementation

**User intent:** “Grill this plan and tell me what will break.”

Use together:

1. `grill-me` clarifies assumptions directly with the user.
2. `grill-with-docs` checks terminology, domain model, `CONTEXT.md`, and ADRs.
3. `scout` or `context-builder` maps affected code areas.
4. `lsp-navigation` / `ast-grep` verify whether the proposed seams actually
   exist.
5. `librarian` checks external API/library assumptions.
6. `reviewer` challenges architecture and test strategy.
7. `oracle` protects prior decisions and flags contradictions.
8. `pi-mermaid` can render the final dependency/flow diagram in Pi.

Composite opportunity: `firehorse-grill-plan` — combine docs, code analysis,
external research, subagent review, and decision consistency into one plan audit.

### 5. Diagnose and fix a bug

**User intent:** “Something is broken; find the root cause and patch it.”

Use together:

1. `diagnose` drives the reproduce → minimize → hypothesize → instrument → fix
   loop.
2. `context-mode` processes logs, test output, stack traces, and large command
   output.
3. `lsp-navigation` traces definitions/references/call hierarchy.
4. `ast-grep` finds repeated structural patterns or migration targets.
5. `librarian` checks upstream library bugs or API semantics.
6. `tdd` adds the regression test before/while fixing.
7. `worker` implements; `reviewer` reviews; `oracle` checks the fix against
   earlier constraints.

Composite opportunity: `firehorse-fix-bug` — root cause, regression test,
minimal patch, and review in one guided flow.

### 6. Build a feature safely

**User intent:** “Implement this feature without drifting from the plan.”

Use together:

1. `planner` produces an implementation plan.
2. `tdd` turns the plan into tests and incremental implementation.
3. `worker` performs bounded implementation tasks.
4. `pi-lens` / `lsp-navigation` / `ast-grep` keep edits grounded in code
   structure.
5. `context-mode` keeps build/test output manageable.
6. `reviewer` reviews the diff.
7. `handoff` captures the final state if another agent/user must continue.

Composite opportunity: `firehorse-build-slice` — turn an approved plan into a
vertical slice with tests, diagnostics, review, and handoff.

### 7. Improve architecture

**User intent:** “Find the deeper refactor or architecture improvement.”

Use together:

1. `improve-codebase-architecture` identifies deepening opportunities.
2. `zoom-out` builds the module/caller/domain map.
3. `grill-with-docs` aligns terminology with `CONTEXT.md` and ADRs.
4. `scout` maps affected areas; `context-builder` compresses the findings.
5. `lsp-navigation` and `ast-grep` validate coupling, references, and repeated
   structures.
6. `reviewer` challenges the proposed design.
7. `pi-mermaid` renders the before/after architecture sketch.

Composite opportunity: `firehorse-architecture-review` — codebase map,
deepening candidates, ADR-aware critique, and suggested tracer-bullet refactor.

### 8. Turn an idea into trackable work

**User intent:** “Turn this vague idea into a PRD/issues/triage-ready backlog.”

Use together:

1. `grill-me` clarifies the idea.
2. `librarian` / `researcher` gather market, API, or implementation context.
3. `to-prd` writes the product requirements.
4. `to-issues` slices the PRD into independently grabbable issues.
5. `triage` labels/routes incoming or generated issues.
6. `setup-matt-pocock-skills` ensures issue tracker conventions are known.

Composite opportunity: `firehorse-product-to-work` — clarify idea, research,
write PRD, generate issues, and set triage state.

### 9. Prototype an idea

**User intent:** “Let me play with a possible design/model before committing.”

Use together:

1. `prototype` chooses terminal prototype for state/business logic or UI variants
   for interface exploration.
2. `impeccable` shapes UI variants and interaction/design quality.
3. `librarian` checks external patterns or examples.
4. `pi-mermaid` renders flows/state machines.
5. `context-mode` stores observations from experiments without bloating context.
6. `to-prd` or `to-issues` converts the validated prototype into planned work.

Composite opportunity: `firehorse-prototype-to-plan` — prototype, evaluate,
document decisions, then convert to PRD/issues.

### 10. Design or improve frontend UI

**User intent:** “Make this product UI/landing page feel much better.”

Use together:

1. `impeccable` provides frontend design vocabulary, critique, polish,
   accessibility, motion, copy, and design-system guidance.
2. `prototype` creates alternate UI variations when the answer is not obvious.
3. `librarian` / `pi-web-access` fetch design-system docs or examples.
4. `reviewer` checks implementation quality.
5. `tdd` covers interaction/state behavior when UI changes need tests.

Composite opportunity: `firehorse-design-pass` — inspect current UI, load design
context, propose variants, implement the selected pass, and review accessibility.

### 11. Handoff, resume, or compress work

**User intent:** “Pause here, give another agent the state, or reduce verbosity.”

Use together:

1. `handoff` writes a compact continuation document.
2. `context-builder` packages relevant context for a subagent.
3. `context-mode` keeps searchable history of large artifacts and command
   outputs.
4. `caveman` reduces communication overhead when the user wants brevity.
5. `delegate` continues bounded work; `oracle` checks consistency after resume.

Composite opportunity: `firehorse-handoff` — summarize state, decisions, files,
open questions, validation, and next agent prompt.

### 12. Release and maintenance

**User intent:** “Ship a new Firehorse release or maintain upstream pins.”

Use together:

1. `firehorse-release` handles release-specific workflow for this repo.
2. `context-mode` processes CI/release output.
3. `librarian` or `pi-web-access` can inspect upstream changelogs/docs.
4. `reviewer` checks release notes and packaging changes.
5. `gh` / GitHub Actions verify tags/releases/CI.

Composite opportunity: already present as `firehorse-release`, but it could be
extended to call out upstream-documentation review and composite workflow docs.

## Recommended composite skills to create later

These should be static Agent Skills first, not a Firehorse runtime. They can
route existing capabilities and tell the agent which primitives to load.

1. `firehorse-ready` — setup/health/compliance check.
2. `firehorse-orient` — understand a repo or code area.
3. `firehorse-research-brief` — external/library research with citations.
4. `firehorse-grill-plan` — plan stress-test using docs, code, web, and
   subagent critique.
5. `firehorse-fix-bug` — bug diagnosis through regression-tested fix.
6. `firehorse-build-slice` — implement a planned vertical slice with review.
7. `firehorse-architecture-review` — architecture/deepening audit.
8. `firehorse-product-to-work` — idea → PRD → issues → triage.
9. `firehorse-prototype-to-plan` — prototype → decision → PRD/issues.
10. `firehorse-design-pass` — frontend design improvement flow.
11. `firehorse-handoff` — pause/resume/delegate state packaging.

## Design guidance for composites

- Start from user intent, not skill names.
- Load only the primitive skills needed for that workflow.
- Prefer `context-mode` for all large outputs and fetched docs.
- Use `pi-lens` before editing code or making structural claims.
- Use `librarian` / `pi-web-access` when assumptions depend on external
  libraries, APIs, docs, or current information.
- Use `pi-subagents` when a second perspective is valuable: scouting,
  research, review, oracle consistency, or bounded implementation.
- Keep composites declarative for now. Do not add a Firehorse runtime or command
  layer until that work is explicitly scoped.
