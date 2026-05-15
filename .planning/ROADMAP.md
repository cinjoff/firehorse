# ROADMAP.md

Phased plan. Phase N completes when its goal + acceptance criteria are
satisfied. Status: `done`, `active`, `next`, `later`.

---

## Phase 1 — Foundation scaffolding — `done`

**Goal:** Establish the monorepo skeleton and adapter contracts. Nothing
shipped, nothing executable — just the typed shape and distribution boundaries.

**Covers:** REQ-01, REQ-02, REQ-03, REQ-04.

**Acceptance:**

- Three packages (`firehorse-core`, `firehorse-pi`, `firehorse-claude`)
  exist with their own `package.json` and intended layout.
- Provider and orchestrator adapters compile and typecheck clean.
- pnpm workspace install is lean (≤ 100 MB); `pnpm typecheck` + `pnpm build`
  succeed.
- `AGENTS.md` (canonical) and `CLAUDE.md` (defers to AGENTS) match repo
  reality.

**Status:** Complete this session. Not yet committed.

---

## Phase 2 — Cross-provider Firehorse definition format — `active`

**Goal:** Decide, document, and validate the declarative authoring format for
workflows and their supporting skills / agent roles that both distributions
consume. Output is a written spec plus core schema/parser/validator and
Pi/Claude projection-generator code, not a runtime or execution engine.

**Covers:** REQ-05.

**Acceptance:**

- `docs/FIREHORSE-DEFINITION-FORMAT.md` describes the source-of-truth schema,
  the `packages/firehorse-core/definitions/{workflows,skills,agent-roles}/`
  authoring layout, and how each distribution adapts it without defining a
  runnable execution graph.
- `firehorse-core` exposes gray-matter-parsed, Zod-backed TypeScript schema,
  parser, validator, and Pi/Claude projection helpers for Firehorse Definition
  Files; every Definition File declares a required integer `schemaVersion`
  starting at `1`.
- A definitions check validates canonical definitions and generated mirrors as
  part of typecheck/CI.
- Full Pi/Claude projection generation is implemented for all three Firehorse-
  authored definition kinds, and generated mirrors are checked in with
  provenance headers.
- Workflow projections target Pi prompt templates and Claude commands; generated
  native resource names use `horse-<id>`.
- Generated mirrors contain fully rendered instructions, preserve canonical
  Markdown headings where possible, include provenance in frontmatter and an HTML
  comment, include SHA-256 source content hashes, and are edited only via
  canonical definitions.
- Workflow mirrors include structured references and instructions for supporting
  capabilities without inlining every supporting body.
- Generated files live under provider-native `firehorse/` folders, and stale
  generated mirrors with valid provenance are removed when their source no longer
  exists.
- Projection generation updates package-local and repo-root install manifests so
  generated resources are exposed by Pi and Claude packages, with generated
  manifest entries sorted deterministically.
- Workflow argument hints are represented in frontmatter for generated command /
  prompt-template UX.
- Projection functions live in `firehorse-core`; repo scripts own file writes;
  `definitions:write` updates generated mirrors/manifests and removes stale
  generated mirrors with valid provenance, while `definitions:check` fails when
  generated output is stale.
- Pi Agent Role mirrors are synced by explicit `firehorse-setup` into the user's
  Pi agent directory because `pi-subagents` does not discover package agent dirs.
- Definition IDs are stable public API; renames require frontmatter
  alias/deprecation handling.
- Upstream skill references use object references with `upstream` and `id`
  fields, and generated manifest entries are sorted deterministically.
- `diagnose-fix` is defined as the first example workflow; it references the
  upstream `mattpocock-skills` `diagnose` skill, uses the Firehorse-authored
  `feedback-loop` skill and `diagnostic-reviewer` Agent Role, accepts a freeform
  bug description argument, and gates code mutation on clear scope plus an
  established regression loop (still no runtime to execute it).
- Workflow body sections are standardized around purpose, usage, inputs,
  outputs, supporting capabilities, orchestration intent, safety gates,
  procedure, and projection notes.
- Firehorse-authored skill definitions use a reusable instruction contract:
  purpose, usage, inputs, outputs, instructions, boundaries, examples, and
  projection notes; imported upstream skills remain upstream-shaped and are not
  normalized into Firehorse's strict skill template.
- Agent-role frontmatter uses the documented `pi-subagents` agent frontmatter
  field set as its basis, plus Firehorse `id` / `kind`, with distribution
  adapters filtering unsupported fields; agent-role bodies use a role contract
  covering mission, responsibilities, inputs, outputs, tools, authority,
  escalation, collaboration, boundaries, and projection notes.
- Provider capability mismatches are represented with provider-neutral
  `requires` / `optional` capability declarations plus projection notes.
- Decision recorded in `.planning/DECISIONS.md`.

**Resolved human-review questions for this phase:**

- Schema version 1 frontmatter fields are accepted by D-135 and documented in
  `docs/FIREHORSE-DEFINITION-FORMAT.md`.

---

## Phase 3 — Skill loader + runtime (core) — `later`

**Goal:** A minimal loader in `firehorse-core` that discovers skills,
validates them, and exposes them via a small runtime API. Still no provider
transport.

**Covers:** REQ-06.

**Acceptance:**

- `firehorse-core` exposes a `loadSkills(rootDir)` (or similar) returning
  typed `Skill` records.
- Schema validation errors are actionable.
- Test coverage for the loader.

---

## Phase 4 — Provider transports — `later`

**Goal:** Each provider adapter actually talks to its backend. Capabilities
declared in Phase 1 stop being aspirational.

**Covers:** REQ-07.

**Acceptance:**

- `ClaudeProvider.run(skill, input)` (or similar) round-trips a tool call.
- Same for `CodexProvider` and `PiProvider`.
- Errors are normalised (mapping per provider) into a single shape.

---

## Phase 5 — Pi distribution: real content + bundled upstreams — `partially active`

**Goal:** `firehorse-pi` becomes useful: it ships actual extensions / skills /
prompts / themes, and selectively bundles the upstream packages users would
otherwise have to install separately.

**Covers:** REQ-08, REQ-13, REQ-14, partial REQ-02 fill-in.

**Acceptance:**

- At least one real skill / extension shipped in `firehorse-pi`.
  - Partial: `mattpocock/skills`, `pbakaus/impeccable`, and `shadcn/ui`
    skill mirrors + `claude-mem` worker runtime / `context-mode` / `pi-lens` /
    `pi-mcp-adapter` / `pi-mermaid` / `pi-subagents` / `pi-web-access` /
    `pi-agent-memory` are wired.
  - Partial: session-start update-check extension is wired.
- `bundledDependencies` wired to the relevant upstream pi package(s) (e.g.
  `pi-gsd`), with the `pi` manifest referencing
  `node_modules/<pkg>/...` paths and selective globs / exclusions.
- `pi install npm:firehorse-pi` in a fresh project gives users the full
  intended surface in one step.

---

## Phase 6 — Claude distribution: real content — `partially active`

**Goal:** `firehorse-claude` becomes useful: real commands, agents, skills,
hooks — adapted Claude variants of the same source skills that `firehorse-pi`
ships.

**Covers:** REQ-13, REQ-14, partial REQ-03 fill-in.

**Acceptance:**

- At least one real command / agent / skill shipped in `firehorse-claude`.
  - Partial: `mattpocock/skills`, `pbakaus/impeccable`, and `shadcn/ui` skill
    mirrors plus shared `pi-subagents` agent mirrors are listed in the Claude
    plugin manifest.
  - Partial: Firehorse's marketplace exposes pinned upstream `claude-mem`, and
    the Firehorse Claude plugin declares it as a dependency.
  - Partial: SessionStart update-check hook is wired.
- `/plugin marketplace add cinjoff/firehorse` + `/plugin install firehorse@firehorse`
  works end-to-end.
- The Claude variants demonstrably correspond to the same source skills and
  shared agent definitions as the Pi side.

---

## Phase 7 — Per-project setup commands — `later`

**Goal:** Each distribution has a `fh:new-project`-style entry point that
scaffolds project-local config for a downstream consumer.

**Covers:** REQ-09.

**Acceptance:**

- Pi: an extension/skill that writes `.pi/settings.json` with the right
  package references and any firehorse-specific project config.
- Claude: a slash command that writes `.claude/`, `CLAUDE.md`, and a
  firehorse-shaped `.planning/` layout (note: not fhhs-shaped — firehorse has
  its own conventions, which we'll have settled by then).
- If the stack uses shadcn/ui and `docs/DESIGN.md` is defined, the workflow
  derives a shadcn preset from the design direction and initializes/applies it
  through the shadcn CLI before component implementation.

---

## Phase 8 — Release prep — `later`

**Goal:** First versioned release of `firehorse` and `firehorse-pi` on npm,
and `firehorse` plugin available via the marketplace.

**Covers:** REQ-10, REQ-12, REQ-X1, REQ-X2.

**Acceptance:**

- ESLint + Prettier configured and CI runs on PRs.
- vitest coverage for core lib adapters.
- CHANGELOG.md or release-notes process in place.
- Initial published versions bumped from `0.0.0` to `0.1.0`.

---

## Out of roadmap (deferred indefinitely)

- Migrating `.pi/gsd/` content (REQ-11). Will revisit once the skill format
  is stable.
- A docs site. README + `docs/ARCHITECTURE.md` are sufficient until release.
