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

### REQ-05 — Skill definition format — `todo`

Decide and document the cross-provider skill format. Inputs:

- Pi expects `SKILL.md` folders + top-level `.md` files in `skills/`.
- Claude expects `skills/<skill>/SKILL.md` (similar).
- Codex / `AGENTS.md` follows the AGENTS convention.

Goal: a single source-of-truth format that the two distributions adapt from,
or two adapters that share enough of the schema that the source skill author
doesn't have to think twice.

### REQ-06 — Skill loader / runtime (core) — `todo`

Once REQ-05 is settled: a loader in `firehorse-core` that discovers skills,
validates them against the schema, and exposes them through a small runtime
API. Still provider-agnostic; transports come later (REQ-07).

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

Selection policy: expose the skills listed by the upstream Claude plugin
manifest, not every directory in the upstream repo; for Impeccable, mirror the
upstream-generated Claude and Pi variants while keeping the canonical `skill/`
source in core; expose the built-in `pi-subagents` agent set as Firehorse shared
subagent definitions. Deprecated, in-progress, personal, and misc skills are not
mirrored unless explicitly allow-listed.

Tooling:

- `pnpm upstreams:check` compares pinned skill commits with remote refs and
  bundled / npm-backed upstream Pi package versions with npm, then exits
  non-zero when an update is available.
- `pnpm upstreams:update:mattpocock-skills` refreshes the Matt Pocock core
  source and both adapter mirrors.
- `pnpm upstreams:update:impeccable` refreshes the Impeccable core source and
  both adapter mirrors.

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

The fh:new-project counterpart for each distribution:

- **firehorse-pi**: an extension or skill that scaffolds project-local
  `.pi/settings.json` and any project-side firehorse config.
- **firehorse-claude**: a `/firehorse:new-project` (or similar) command that
  scaffolds `.planning/`, `CLAUDE.md`, etc., adapted to firehorse conventions
  (not fhhs-skills'd).

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
prevents bloat. Revisit once we actually import Pi core modules — peers
become non-optional then, but `auto-install-peers=false` will still need to
stay (consumers `pi install` will provide them).
