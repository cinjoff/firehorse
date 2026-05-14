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

## Phase 2 — Cross-provider skill format — `next`

**Goal:** Decide and document the skill / agent definition format that both
distributions consume. Output is a written spec, not code.

**Covers:** REQ-05.

**Acceptance:**

- `docs/SKILL-FORMAT.md` describes the source-of-truth schema, the directory
  layout authors use, and how each distribution adapts it.
- At least one example skill defined in the format (still no runtime to
  execute it).
- Decision recorded in `.planning/DECISIONS.md`.

**Open questions for this phase:**

- Single canonical format vs two parallel formats with shared schema?
- Does the format live in `firehorse-core` (e.g. a TS schema + Zod), or
  purely as documented Markdown frontmatter?
- How do provider capability mismatches (e.g. no vision in Pi) surface to
  the skill author?

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
  - Partial: `mattpocock/skills` and `pbakaus/impeccable` mirrors +
    `context-mode` / `pi-lens` / `pi-mcp-adapter` / `pi-mermaid` /
    `pi-subagents` / `pi-web-access` are wired.
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
  - Partial: `mattpocock/skills` and `pbakaus/impeccable` mirrors plus shared
    `pi-subagents` agent mirrors are listed in the Claude plugin manifest.
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
