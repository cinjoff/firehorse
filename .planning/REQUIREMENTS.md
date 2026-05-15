# REQUIREMENTS.md

Tracked work items. Each REQ has an ID, status, and the phase that owns it
(see `ROADMAP.md`). Done items stay listed; they don't get removed.

Status legend: `done`, `in-progress`, `todo`, `deferred`.

---

## Foundation (Phase 1 — current state)

### REQ-01 — Cross-provider core library — `done`

Typed contracts and registries for provider and orchestrator adapters.

- `firehorse-core/src/types.ts` — shared types.
- `firehorse-core/src/providers/{provider,claude,codex,pi,index}.ts`.
- `firehorse-core/src/orchestrators/{orchestrator,superset,conductor,tmux,terminal,detect,index}.ts`.
- Adapter contracts; no execution; env-driven detection only.

### REQ-02 — Pi package distribution scaffold — `done`

`packages/firehorse-pi/`:

- `package.json` with `pi-package` keyword, `pi` manifest, Pi core deps in
  `peerDependencies` per Pi's contract.
- Convention dirs (`extensions/`, `skills/`, `prompts/`, `themes/`) with
  `.gitkeep` placeholders.
- README documenting bundle-and-filter patterns from Pi docs.

### REQ-03 — Claude plugin distribution scaffold — `done`

`packages/firehorse-claude/`:

- `.claude-plugin/plugin.json` manifest.
- `commands/`, `agents/`, `skills/`, `hooks/` with `.gitkeep` placeholders.
- Repo-level `.claude-plugin/marketplace.json` exposing the plugin so users
  can `/plugin marketplace add cinjoff/firehorse`.

### REQ-04 — Workspace tooling — `done`

- pnpm workspaces (`pnpm-workspace.yaml`).
- Root `package.json` (private workspace) with `-r --filter='./packages/*'`
  scripts.
- `tsconfig.base.json` extended by each package.
- `.npmrc` with `auto-install-peers=false` (keeps install lean — saved
  ~160 MB by not pulling optional Pi peers like `@google/genai`).
- Verified: `pnpm typecheck` and `pnpm build` both pass.

---

## Next up

### REQ-05 — Firehorse definition format — `in-progress`

Decide and document the cross-provider authoring format for workflows and their
supporting skills / agent roles. Inputs:

- Pi expects `SKILL.md` folders + top-level `.md` files in `skills/`.
- Claude expects `skills/<skill>/SKILL.md` (similar).
- Codex / `AGENTS.md` follows the AGENTS convention.

Goal: Firehorse-authored definitions live canonically under
`packages/firehorse-core/definitions/` and are adapted into distribution-native
files. Imported upstream skills remain upstream-shaped curated ingredients.
`firehorse-core` also owns the gray-matter-parsed, Zod-backed TypeScript schema,
parser, validator, and Pi/Claude projection generator for Firehorse Definition
Files so format and projection drift are caught before any runtime exists.
`gray-matter` and `zod` are normal `firehorse-core` dependencies. Every
Definition File declares a required integer `schemaVersion` starting at `1`.
Workflow mirrors target Pi prompt templates and Claude commands, generated native names use `horse-<id>`,
generated files live under provider-native `firehorse/` folders, generated
mirrors are checked in with provenance headers, projection file writes only
overwrite valid generated files, stale generated mirrors are removed when their
source disappears, and definition validation runs as part of typecheck/CI.
Generated mirrors contain fully rendered instructions, preserve canonical
headings where possible, include structured supporting-capability references,
machine-readable and human-visible provenance, and SHA-256 source content hashes. They
are exposed through generated package-local and repo-root manifest updates, and
must be changed by editing canonical definitions rather than hand-editing
mirrors. Pi Agent Role mirrors are synced by explicit setup into the user's Pi
agent directory. Definition IDs are stable public API with frontmatter
alias/deprecation handling for renames. Upstream skill references use object
references with `upstream` and `id`, and generated manifest entries are sorted
deterministically. The repo exposes `definitions:write` and `definitions:check`;
write mode removes stale generated mirrors with valid provenance, and check mode
fails on stale output. The initial fixture is `diagnose-fix`, with the
Firehorse-authored `feedback-loop` skill and `diagnostic-reviewer` Agent Role.

### REQ-06 — Skill loader / runtime (core) — `todo`

Once REQ-05 is settled: a loader in `firehorse-core` that discovers definitions
using the existing schema/parser/validator and exposes them through a small
runtime API. Still provider-agnostic; transports come later (REQ-07).

### REQ-07 — Provider transports — `todo`

Wire actual API calls inside each provider adapter:

- `ClaudeProvider` → `@anthropic-ai/sdk`.
- `CodexProvider` → Codex CLI invocation OR OpenAI SDK, whichever fits.
- `PiProvider` → Pi.dev API or CLI.

Until then, providers only declare capabilities; they don't talk to anything.

### REQ-08 — Selective bundling: upstream Pi packages — `in-progress`

Use the Pi `bundledDependencies` pattern (see `firehorse-pi/README.md`) to
selectively re-export the upstream Pi packages that firehorse-pi wants its
users to have by default. This is the **one-time-install gets you everything**
UX from the original ask.

Current bundled upstreams:

- `context-mode` (`1.0.133`) — extension + allow-listed skills.
- `pi-lens` (`3.8.44`) — extension + allow-listed skills.
- `pi-mcp-adapter` (`2.6.1`) — MCP adapter extension.
- `pi-mermaid` (`0.3.0`) — Mermaid diagram rendering extension for the Pi TUI.
- `pi-subagents` (`0.24.2`) — subagent extension, skill, prompt templates,
  built-in agents, and Firehorse default tool overrides.
- `pi-web-access` (`0.10.7`) — web/search/fetch extension plus the allow-listed
  `librarian` research skill.
- `claude-mem` (`13.2.0`) — bundled upstream memory worker package for Pi-only
  harness use; Firehorse-pi starts/checks the bundled worker without requiring
  Claude Code to be installed.
- `pi-agent-memory` (`0.3.4`) — Pi memory extension plus the allow-listed
  `mem-search` skill, backed by the bundled/running `claude-mem` worker.
  Firehorse also ships `firehorse-memory-project`, which applies setup-pinned
  `FIREHORSE_PROJECT_NAME` / `PI_MEM_PROJECT` / `CLAUDE_MEM_PROJECT` values
  before the memory extension starts. Setup must verify the worker and use
  upstream `npx claude-mem install` / Claude plugin marketplace setup only as a
  fallback or repair path.

The `pi` manifest is intentionally an allow-list rather than `node_modules/*`
whole-package exposure. `pnpm-lock.yaml` records the exact resolved versions
that will be bundled into the next firehorse-pi tarball. A future `pi-gsd`
package can be added the same way once it exists.

### REQ-13 — Vendored upstream skills and shared agents — `in-progress`

Track upstream skill repositories and shared agent definitions in core, mirror
selected resources into the Pi and Claude distributions, and provide a way to
detect remote changes before a Firehorse release.

Current upstreams:

- `mattpocock/skills` pinned at
  `packages/firehorse-core/upstreams/mattpocock-skills/UPSTREAM.json`.
- `pbakaus/impeccable` pinned at
  `packages/firehorse-core/upstreams/impeccable/UPSTREAM.json`.
- `pi-subagents` built-in agent definitions pinned at
  `packages/firehorse-core/upstreams/pi-subagents/UPSTREAM.json`.
- `claude-mem` pinned at
  `packages/firehorse-core/upstreams/claude-mem/UPSTREAM.json` and exposed to
  Claude through a Firehorse marketplace dependency.
- `pi-agent-memory` pinned at
  `packages/firehorse-core/upstreams/pi-agent-memory/UPSTREAM.json` and exposed
  to Pi through the bundled package allow-list.
- `shadcn-ui` pinned at
  `packages/firehorse-core/upstreams/shadcn-ui/UPSTREAM.json` and mirrored into
  both Pi and Claude as the official `shadcn` agent skill.

Selection policy: expose the skills listed by the upstream Claude plugin
manifest, not every directory in the upstream repo; for Impeccable, mirror the
upstream-generated Claude and Pi variants while keeping the canonical `skill/`
source in core; expose the built-in `pi-subagents` agent set as Firehorse shared
subagent definitions; keep `claude-mem` as an upstream-owned runtime by exposing
it as a Claude plugin dependency and bundling its npm package in Firehorse-pi for
Pi-only worker startup; expose `pi-agent-memory` through explicit Pi package
paths that connect to the running claude-mem worker; expose the official
`shadcn/ui` agent skill because shadcn work requires project-aware CLI,
registry, component-composition, and preset rules.
Firehorse setup verifies the bundled claude-mem worker is installed/reachable and
resolves the memory project id with
`gh repo view --json name --jq .name` rather than relying on git parent/cwd
inference, so Superset and Conductor worktrees share the canonical GitHub repo
memory namespace. Deprecated, in-progress, personal, and misc skills are not
mirrored unless explicitly allow-listed.

Tooling:

- `pnpm upstreams:check` compares pinned skill commits with remote refs and
  bundled / npm-backed upstream Pi package versions with npm, then exits
  non-zero when an update is available.
- `pnpm upstreams:update:mattpocock-skills` refreshes the Matt Pocock core
  source and both adapter mirrors.
- `pnpm upstreams:update:impeccable` refreshes the Impeccable core source and
  both adapter mirrors.
- `pnpm upstreams:update:shadcn-ui` refreshes the official shadcn skill core
  source and both adapter mirrors.

### REQ-14 — Session-start update checks — `done`

Notify users when newer Firehorse package/plugin releases are available.

- **Pi:** `extensions/firehorse-update-check.ts` runs on `session_start`, checks
  npm's latest `firehorse-pi`, and suggests `pi update npm:firehorse-pi` with a
  GitHub release notes link.
- **Claude:** `hooks/hooks.json` runs `hooks/check-update.mjs` on `SessionStart`,
  checks the latest `cinjoff/firehorse` GitHub release, and suggests
  `/plugin update firehorse@firehorse`.

These checks rely on Firehorse version bumps and release changelogs. They do not
check upstream repos directly at user runtime; upstream changes are covered once
Firehorse vendors and releases them.

### REQ-09 — Per-project setup commands — `todo`

The `horse-new-project` counterpart for each distribution, generated after the
Firehorse Definition Format projection generator exists:

- **firehorse-pi**: a generated provider-native prompt/skill surface that creates
  or syncs durable project anchors without GSD.
- **firehorse-claude**: a generated provider-native command/skill surface with
  the same interview flow and document set.

Target document set:

- `docs/PROJECT.md` — periodically updated high-level product picture with
  vision, target users, problem, value proposition, success criteria,
  constraints, and open questions. PRDs reference this anchor rather than
  duplicating it.
- `docs/DESIGN.md` — only when brand/design language is actually defined.
- `docs/codebase/ARCHITECTURE.md`
- `docs/codebase/STRUCTURE.md`
- `docs/codebase/CONVENTIONS.md`
- `docs/codebase/TESTING.md`
- `docs/codebase/INTEGRATIONS.md`
- `docs/codebase/CONCERNS.md`

Only create `docs/codebase/*` after code exists or starter setup runs; do not
write planned codebase placeholders. `horse-map-codebase` writes the split
codebase anchors exactly, not one combined map, and includes source commit/hash
and timestamp freshness metadata in each codebase anchor.

Behavior: support both greenfield and brownfield projects, fill missing anchors,
and never overwrite user-authored docs without asking. Do not create `.planning/`
or GSD files. Generate/update a clearly marked Firehorse section in cross-
provider `AGENTS.md` guidance rather than Claude-only guidance. Brownfield mode
analyzes existing code before asking and uses reusable `horse-map-codebase`
behavior to fill `docs/codebase/` anchors, preferring provider delegation when
available and falling back to single-agent analysis. The interview is a
lightweight product/business discovery grill, with optional brand definition via
Impeccable. If the user explicitly opts in, the workflow may run starter app /
hosting / database-auth / dependency setup automation explained in non-technical
language, with confirmation before each external mutation command. It never
performs Sentry/observability setup. When the selected stack uses shadcn/ui and
`docs/DESIGN.md` is created or updated, derive a shadcn preset from the design
direction and use the shadcn CLI (`init --preset` for new apps or
`apply --preset` for existing apps) before adding UI components; do not decode
preset codes manually or hand-edit theme files before the preset path is tried.
Before issue drafting, run/use the bundled
`setup-matt-pocock-skills` behavior so issue tracker, triage labels, and domain-
doc expectations are recorded for `to-prd` / `to-issues`. Then draft GitHub
issues after discovery by referencing the bundled `to-prd` / `to-issues`
behavior rather than copying their full templates: setup / infrastructure tasks
plus product vertical-slice issues, grouped with approved labels and an `MVP`
milestone. Propose labels:
`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`,
`setup`, `product`, `design`, `frontend`, `backend`, `infra`, `docs`, and
`blocked`; create only approved missing labels. Write local drafts first as
zero-padded paths `docs/prds/prd-0001-{slug}.md` and
`docs/issues/issue-0001-{slug}.md` so work can be reviewed, handed off, or
continued if GitHub is not configured. Keep local drafts after publishing and
update them with GitHub issue links. Ask for approval before creating labels,
milestones, or issues, and only then call `gh issue create`; missing GitHub CLI
auth must not block project anchor or draft creation, but issue creation is
blocked until `gh` works. Starter repos default to private GitHub repos from
`cinjoff/fh-starter-project`; in existing repos, clone/copy the starter to a
temporary location, copy non-conflicting files by default, produce a conflict
report, and ask before replacing any existing files. After starter setup creates
code, run codebase mapping. The product discovery interview should be
medium-depth and one-question-at-a-time, with the workflow recommending an answer
for each question; continue until vision, target users, problem, value
proposition, and success criteria are crisp. Technical explanations for starter
app, hosting, database/auth, and environment variables should be fixed,
non-technical text embedded in the workflow.

### REQ-10 — Tests — `todo`

vitest is installed; no tests yet. Priorities:

- Orchestrator `detect()` and `readEnvironment()` purity + correctness.
- Provider registry round-trip.
- Once REQ-05/06 land: skill loader + schema validation.

### REQ-11 — Migrate selected `.pi/gsd/` content — `deferred`

`.pi/gsd/` contains a large agent/workflow library from fhhs-skills. Some of
it is reusable; most is Claude-shaped. Out of scope until REQ-05 settles the
skill format — then we can selectively port and adapt.

### REQ-12 — Docs site / public release — `deferred`

No releases until at least REQ-05..07 land. Versions stay at `0.0.0`.

---

## Cross-cutting

### REQ-X1 — Linting — `todo`

ESLint config (root + per package), wired to `pnpm lint`. Not blocking.

### REQ-X2 — CI — `todo`

GitHub Actions: `pnpm install`, `typecheck`, `build`, `test` on PRs. Trivial
once tests exist.

### REQ-X3 — Pi peer-dep declaration hygiene — `todo`

`firehorse-pi`'s peer deps were marked optional and `auto-install-peers=false`
prevents bloat. Legacy upstream peer names such as `@mariozechner/*` may remain
optional while bundled upstream Pi packages still import them. Revisit once we
actually import Pi core modules — peers become non-optional then, but
`auto-install-peers=false` will still need to stay (consumers `pi install` will
provide them).
