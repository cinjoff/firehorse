# DECISIONS.md

Log of binding decisions. Append-only. Each entry: ID, date, decision,
rationale, alternatives considered. Update an entry only if a later decision
supersedes it (record that as a new entry that references the old).

Date format: `YYYY-MM-DD`.

---

## D-01 — TypeScript / Node as the framework runtime

**Date:** 2026-05-14
**Decision:** Firehorse itself is TypeScript / Node ≥ 20, ESM-first.
**Rationale:** Best fit for the orchestrator integration layer (most
orchestrators expose Node-friendly hooks), best fit for the Claude plugin
ecosystem, and easy interop with the Pi package model (which is npm-based).
**Alternatives considered:**

- Python (native Pydantic AI fit) — rejected: would require a second
  ecosystem just for orchestrator integration, and Pi packages are npm.
- Polyglot (Python core + TS shims) — rejected: too much setup overhead for
  a scaffolding-stage project; can revisit if Python skill authoring
  becomes the dominant use case.
- Markdown-only (no runtime) — rejected: we need real provider/orchestrator
  adapter logic, not just prompts.

## D-02 — pnpm monorepo with three packages

**Date:** 2026-05-14
**Decision:** Single repo, pnpm workspaces, three packages:
`firehorse-core`, `firehorse-pi`, `firehorse-claude`.
**Rationale:** Each ecosystem (npm consumers, Pi, Claude Code) has a
different consumption model; one package can't serve all three. Monorepo
keeps them in lockstep without coordination overhead.
**Alternatives considered:**

- Three separate repos — rejected: coordination cost too high for a small
  project, version drift inevitable.
- Single package that's all three — rejected: Pi expects a specific manifest
  shape, Claude expects a specific directory shape; mashing them together
  produces neither.

## D-03 — Distribution packages are siblings, not derived

**Date:** 2026-05-14
**Decision:** `firehorse-pi` and `firehorse-claude` both adapt
`firehorse-core` to their ecosystem's idioms. Neither builds on the other.
**Rationale:** Pi uses TypeScript extensions and file-convention loading;
Claude uses Markdown commands/agents and directory-convention loading. A
shared "intermediate format" between them would be a lossy abstraction.
Better: the cross-cutting parts (provider, orchestrator) live in core; each
distribution owns the rest natively.
**Alternatives considered:**

- Build `firehorse-claude` on top of `firehorse-pi` — rejected: pulls Pi
  dependencies into Claude users' install path for no benefit.
- Define a shared "skill IR" that both compile from — deferred: maybe in
  Phase 2/3 once the skill format settles, but not a v0 commitment.

## D-04 — Provider and orchestrator are first-class, separable concerns

**Date:** 2026-05-14
**Decision:** Provider (Claude / Codex / Pi) and orchestrator (Superset /
Conductor / tmux / terminal) live in separate adapter trees with no
cross-dependence in the core.
**Rationale:** They vary independently in practice — same provider, multiple
orchestrators, and vice versa. Coupling them would force a combinatorial
adapter explosion.
**Alternatives considered:**

- Single "environment" adapter — rejected: hides real differences and
  produces leaky abstractions.

## D-05 — Pi peer-dependency model per Pi docs

**Date:** 2026-05-14
**Decision:** Pi core packages (`@earendil-works/pi-ai`, `pi-agent-core`,
`pi-coding-agent`, `pi-tui`, `typebox`) go in `peerDependencies` with `"*"`.
Other Pi packages we want to selectively re-export (e.g. a future `pi-gsd`)
go in both `dependencies` and `bundledDependencies`, with `pi` manifest paths
referencing `node_modules/<pkg>/...`.
**Rationale:** Matches the contract documented at
https://pi.dev/docs/latest/packages. Pi loads bundled deps with separate
module roots so no collision.
**Alternatives considered:** None — this is Pi's published contract; we
follow it.

## D-06 — `auto-install-peers=false` to keep installs lean

**Date:** 2026-05-14
**Decision:** Add `.npmrc` with `auto-install-peers=false` and
`strict-peer-dependencies=false`.
**Rationale:** pnpm 9 auto-installed optional Pi peer dependencies
(`@google/genai`, `protobufjs`, `koffi`, ...) bringing `node_modules` to
~250 MB for a scaffolding project. Disabling cut it to ~90 MB.
**Alternatives considered:**

- Remove peer deps entirely until we import them — rejected: peer deps
  document the consumer-side contract, useful even when we don't import.
- Keep auto-install on, accept the size — rejected: trivial fix, no reason
  to pay the cost.

## D-07 — `.pi/gsd/` is read-only reference material

**Date:** 2026-05-14
**Decision:** Leave `.pi/gsd/` (the fhhs-skills GSD agent library that was
already in the worktree) untouched. Do not migrate, do not delete.
**Rationale:** It's valuable as a reference for skill / workflow shapes once
we settle the skill format (REQ-05 / Phase 2). Premature migration risks
locking in fhhs-shaped decisions that don't fit firehorse.
**Alternatives considered:**

- Delete to keep the repo clean — rejected: would lose useful prior art.
- Migrate immediately into `packages/firehorse-pi/skills/` — rejected:
  no skill format yet.

## D-08 — `AGENTS.md` is canonical; `CLAUDE.md` defers to it

**Date:** 2026-05-14
**Decision:** Cross-provider agent guidance lives in `AGENTS.md` (the
convention popularised by Codex). `CLAUDE.md` exists for Claude-specific
deviations only and points back at `AGENTS.md` for everything else.
**Rationale:** Firehorse is cross-provider; the guidance source-of-truth
should be too. Duplicating content in both files would inevitably drift.
**Alternatives considered:**

- `CLAUDE.md` as canonical — rejected: misaligned with the project's
  cross-provider stance.
- Single shared file with both names symlinked — rejected: confusing on
  case-insensitive filesystems and on diff tools.

## D-09 — Lightweight `.planning/` instead of running fh:gsd-tools

**Date:** 2026-05-14
**Decision:** The `.planning/` files in this repo are hand-written and
self-contained. Do not symlink in `gsd-tools.cjs` or any other fh-plugin
machinery.
**Rationale:** Firehorse exists in part because fhhs-skills was too heavy.
Bootstrapping firehorse using the very tooling we're trying to slim down
would be inconsistent. Firehorse will grow its own (lighter) planning
conventions over time.
**Alternatives considered:**

- Run the full `/fh:new-project` flow including `gsd-tools config-ensure-section`
  — rejected: pulls in dependencies and assumptions that contradict the
  project's stated direction.

## D-10 — Repo root is an install entry point for Pi and Claude

**Date:** 2026-05-14
**Decision:** Keep distribution-owned files in `packages/firehorse-pi` and
`packages/firehorse-claude`, but expose thin repo-root install metadata:
root `package.json` has a `pi` manifest pointing at `packages/firehorse-pi`,
and root `.claude-plugin/marketplace.json` points at
`packages/firehorse-claude`.
**Rationale:** Pi git installs target the package root, while Claude Code
marketplace installs expect `.claude-plugin/marketplace.json` at the repository
root. This lets users point at `github.com/cinjoff/firehorse` without moving
Pi or Claude conventions out of their owning distribution packages.
**Alternatives considered:**

- npm-only Pi install — rejected: less convenient during pre-publish and for
  users who want to install from GitHub directly.
- Move Pi resource directories to the repo root — rejected: violates the
  package-boundary rule that Pi conventions live in `firehorse-pi`.

## D-11 — Bundle context-mode and pi-lens in firehorse-pi

**Date:** 2026-05-14
**Decision:** `firehorse-pi` bundles `context-mode` and `pi-lens` as its first
upstream Pi package re-exports. Both are listed in `dependencies` and
`bundledDependencies`, and their Pi extensions / skills are referenced through
`node_modules/<pkg>/...` paths in the Pi manifests. Non-Pi runtime dependencies
needed by the re-exported packages remain normal pinned `dependencies` so npm
can install platform-specific optional packages correctly while Firehorse still
controls version drift.
**Rationale:** Users should install one Firehorse Pi package and receive the
selected upstream Pi surface without separately installing `context-mode` or
`pi-lens`. Updating firehorse-pi updates the bundled upstream copies shipped in
its tarball. The `pi` manifest remains a resource allow-list, so bundling an
upstream package does not automatically expose every upstream skill/prompt/theme
on Firehorse's public surface.
**Alternatives considered:**

- Ask users to install `context-mode` and `pi-lens` separately — rejected:
  violates the one-install UX.
- Copy their files into Firehorse — rejected: would fork upstream packages and
  lose normal dependency/version tracking.

## D-12 — Track upstream skill repos in core and mirror into adapters

**Date:** 2026-05-14
**Decision:** Vendored upstream skill repositories live in
`packages/firehorse-core/upstreams/<upstream>/` with an `UPSTREAM.json` file
recording source, ref, pinned commit, license, selection policy, and adapter
paths. Distribution packages keep generated mirrors under their own native
`skills/` directories and expose selected skills through their own manifests.
**Rationale:** Firehorse needs a canonical place to track upstream provenance
and updates, but Pi and Claude packages must remain self-contained and idiomatic
for installation. Mirroring from core gives users one Firehorse package/plugin
to update while preserving a reviewable upstream diff for maintainers.
**Alternatives considered:**

- Git submodule — rejected: npm/git package installs do not reliably include
  submodule contents, and users should not need recursive clone semantics.
- Fetch upstream repos at user install time — rejected: non-reproducible,
  network-dependent installs and poor reviewability.
- Put upstream repos directly in each adapter only — rejected: duplicates the
  source of truth and makes Pi/Claude drift likely.

## D-13 — Runtime update checks use Firehorse release versions

**Date:** 2026-05-14
**Decision:** Pi and Claude session-start update checks compare the installed
Firehorse package/plugin version with the latest Firehorse release/package
version. They do not check upstream skill repositories directly at user runtime.
**Rationale:** Upstream skill and bundled package changes are incorporated by
maintainers, reviewed, and released as Firehorse versions with GitHub release
notes. Users should only need to update Firehorse and read the Firehorse
changelog to understand both Firehorse-native and upstream-originated changes.
This keeps startup checks fast, reproducible, and aligned with package-manager
semantics.
**Alternatives considered:**

- Check every upstream repository at user startup — rejected: noisy, slow,
  network-heavy, and can report changes that Firehorse has not vetted or
  released yet.
- Disable runtime checks entirely — rejected: users would miss released updates
  unless they manually check package managers.

## D-14 — Bundle pi-subagents and pi-mcp-adapter in firehorse-pi

**Date:** 2026-05-14
**Decision:** `firehorse-pi` also bundles `pi-subagents` and
`pi-mcp-adapter`, exposing their Pi extensions through explicit
`node_modules/<pkg>/...` manifest paths. `pi-subagents` additionally exposes its
single `pi-subagents` skill and prompt templates; `pi-mcp-adapter` exposes only
its extension.
**Rationale:** These packages are core parts of the desired Firehorse Pi user
experience. Users should install or update one `firehorse-pi` package rather
than separately managing subagent orchestration and MCP adapter installs.
Keeping them as bundled upstream Pi packages preserves normal npm provenance and
version tracking while avoiding Firehorse-authored runtime code.
**Alternatives considered:**

- Ask users to install `pi-subagents` and `pi-mcp-adapter` separately —
  rejected: repeats the fragmented install UX Firehorse is meant to remove.
- Copy their source files directly into Firehorse — rejected: would fork the
  upstream packages and make updates harder to audit.

## D-15 — Mirror pi-subagents built-in agents as shared Firehorse definitions

**Date:** 2026-05-14
**Decision:** Track the built-in `pi-subagents` agent definitions in
`firehorse-core/upstreams/pi-subagents/` as pinned upstream agent sources, expose
the Claude-compatible mirrors in `firehorse-claude/agents/`, and keep Pi using
the bundled `pi-subagents` runtime's built-in agent files.
**Rationale:** Firehorse needs one reviewed source of truth for the subagent
roles while still respecting each ecosystem's loader. Claude plugin agents need
Claude-compatible frontmatter and tool names; Pi's subagent runtime already
loads the same pinned upstream agent files from the bundled package. This gives
users matching agent roles in both ecosystems without introducing a Firehorse
agent runtime or forking `pi-subagents` execution code.
**Alternatives considered:**

- Patch `pi-subagents` to load Firehorse-owned agent files directly — deferred:
  that would modify upstream runtime behavior and is better handled upstream if
  we need a configurable built-in agent directory later.
- Keep the agents Pi-only — rejected: it leaves Claude without the same shared
  role vocabulary and undermines the cross-provider distribution goal.

## D-16 — Firehorse-pi applies default subagent tool overrides

**Date:** 2026-05-14
**Decision:** Ship `packages/firehorse-pi/firehorse.subagents.json` as the
Firehorse package-owned default override manifest for built-in `pi-subagents`
roles. A session-start Pi extension applies missing defaults into
`~/.pi/agent/settings.json`, adding bundled `pi-lens` code-intelligence tools to
code-oriented subagents.
**Rationale:** `pi-subagents` only reads builtin overrides from Pi settings;
package manifests cannot currently contribute `subagents.agentOverrides`
directly. Applying package-owned defaults on startup gives Firehorse users the
same improved subagent tool surface after a one-step install while preserving the
upstream `pi-subagents` runtime and avoiding a fork. Existing user-authored
`tools` allowlists are respected unless Firehorse previously created them.
**Alternatives considered:**

- Document a manual settings snippet only — rejected: users would not get the
  intended Firehorse defaults from a one-step install.
- Patch the bundled `pi-subagents` package to change its built-in files —
  rejected: that would fork upstream runtime/package contents and make updates
  harder to audit.
- Add `subagents.agentOverrides` to `package.json` only — rejected: Pi package
  discovery and `pi-subagents` do not read package-level settings today.

## D-17 — Bundle pi-web-access and expose librarian in firehorse-pi

**Date:** 2026-05-14
**Decision:** `firehorse-pi` bundles `pi-web-access@0.10.7`, exposes its Pi
web/search/fetch extension, and allow-lists only the `librarian` skill from the
package's skill directory.
**Rationale:** Firehorse's Pi distribution should include the research and
source-citation surface users expect from a one-step install. `pi-web-access` is
an upstream Pi package with normal npm provenance, so bundling it follows the
same dependency pattern as the other curated Pi packages while avoiding a
Firehorse-owned web tool fork. The manifest still points at the specific
`librarian` skill path rather than exposing every future upstream skill by
accident.
**Alternatives considered:**

- Ask users to install `pi-web-access` separately — rejected: violates the
  one-install Firehorse Pi UX.
- Copy the extension or `librarian` skill into Firehorse — rejected: would fork
  upstream web tooling and make updates harder to audit.
- Expose `./node_modules/pi-web-access/skills` wholesale — rejected: too broad;
  Firehorse keeps bundled package resources behind an explicit allow-list.

## D-18 — Configure Superset MCP through Pi's user-global MCP file

**Date:** 2026-05-14
**Decision:** `firehorse-pi` ships a session-start extension that adds the
hosted Superset MCP endpoint (`https://api.superset.sh/api/v2/agent/mcp`) to
Pi's user-global MCP config (`~/.pi/agent/mcp.json`, or
`$PI_CODING_AGENT_DIR/mcp.json`) using `pi-mcp-adapter` bearer-token
authentication with `bearerTokenEnv: "SUPERSET_API_KEY"`. Firehorse may load
that variable from a user-scoped `~/.config/firehorse/superset.env` file only
when the file is private (`0600` on Unix-like systems).
**Rationale:** Superset's MCP server is hosted HTTP, so there is no server
binary to bundle. The correct bundled package is the existing `pi-mcp-adapter`
plus MCP SDK runtime dependencies. A user-global Pi config makes the server
durable across new workspaces while keeping Superset API keys out of project
repos and generated worktrees. A private Firehorse env file supports Pi sessions
launched outside shells that source `~/.zshrc` / `~/.bashrc`.
**Alternatives considered:**

- Write `.mcp.json` into each project — rejected: project-local config is not
  durable across new workspaces and risks committing credentials.
- Store the API key directly in MCP config — rejected: avoid duplicating secrets
  and keep the MCP file shareable/debuggable.
- Rely only on OAuth — rejected for this path: interactive OAuth remains useful,
  but the requested workflow needs headless skill/automation use with a Superset
  API key.

## D-19 — Firehorse first-time setup is an explicit skill

**Date:** 2026-05-14
**Decision:** Superset MCP configuration moves out of automatic session-start
behavior and into explicit, idempotent `firehorse-setup` skills in each
distribution. The setup skills support `--check`, detect Superset usage, and
only write provider user-global MCP config when Superset is detected or the user
opts in with `--superset`. Pi setup writes `~/.pi/agent/mcp.json` (or
`$PI_CODING_AGENT_DIR/mcp.json`) for `pi-mcp-adapter`; Claude setup registers a
Claude Code user-scoped server in `~/.claude.json` via `claude mcp add-json
--scope user` and a `headersHelper`. D-19 supersedes D-18's session-start
MCP-registration mechanism while keeping D-18's user-global MCP config shape and
secret-handling rules. A non-mutating session-start extension may still load the
optional private Superset env file so `pi-mcp-adapter` can resolve
`SUPERSET_API_KEY` in Pi sessions launched outside a shell profile.
**Rationale:** Firehorse will need several one-time setup tasks over time
(dependency checks, MCP servers, provider/orchestrator integration, optional
external tools). Running those from a setup skill is predictable, auditable, and
user-invoked, unlike session-start mutations that surprise users and run in every
workspace. This matches the successful `fh:setup` pattern from `fhhs-skills`
while staying within Firehorse's no-runtime/no-command scaffolding constraints.
**Alternatives considered:**

- Keep automatic session-start Superset MCP registration — rejected: too
  surprising and not extensible as more setup steps appear.
- Add a slash command/runtime setup executable now — rejected: Firehorse has not
  introduced its own command/runtime layer yet; provider-native skills are
  sufficient for Pi and Claude.
- Only document manual setup — rejected: loses the first-run guided experience
  users expect from Firehorse.

## D-20 — Bundle pi-mermaid in firehorse-pi

**Date:** 2026-05-14
**Decision:** `firehorse-pi` bundles `pi-mermaid@0.3.0` and exposes its Pi
extension through an explicit `node_modules/pi-mermaid/index.ts` manifest path.
The repo-root Pi manifest mirrors the same extension path for GitHub installs.
**Rationale:** Mermaid diagram rendering is a useful default Pi TUI capability
and fits Firehorse's one-install UX for curated upstream Pi packages. Keeping it
as a bundled upstream package preserves npm provenance and version tracking
without copying the extension into Firehorse.
**Alternatives considered:**

- Ask users to install `pi-mermaid` separately — rejected: fragments the Pi
  setup experience Firehorse is meant to consolidate.
- Copy `pi-mermaid` into Firehorse — rejected: would fork a small upstream
  extension and make future updates harder to audit.
- Expose all future `pi-mermaid` resources wholesale — rejected: Firehorse keeps
  bundled package resources behind explicit manifest paths.

## D-21 — Directly pin runtime dependencies needed by local-path bundled Pi packages

**Date:** 2026-05-14
**Decision:** When a bundled upstream Pi package is exposed through
`node_modules/<pkg>/...`, Firehorse may also pin that package's non-Pi runtime
dependencies as direct `firehorse-pi` dependencies when Pi's loader must resolve
them from Firehorse's package root. For `pi-mermaid`, `beautiful-mermaid@1.1.3`
and `mermaid@11.15.0` are direct Firehorse dependencies as well as transitive
`pi-mermaid` dependencies.
**Rationale:** Local-path development installs use pnpm symlinks, while Pi's
extension loader imports the configured `node_modules/pi-mermaid/index.ts` path
and resolves bare imports from that package path. Without direct package-root
entries, `pi-mermaid` cannot find `beautiful-mermaid` even though pnpm's virtual
store contains it. Direct pins make both local-path and packaged npm installs
resolve the runtime modules consistently without bundling those libraries as Pi
resources.
**Alternatives considered:**

- Rely on pnpm's virtual store transitive dependency layout — rejected: Pi's
  loader can preserve the configured symlink path and fail bare import
  resolution in local sessions.
- Add `beautiful-mermaid` / `mermaid` to `bundledDependencies` — rejected: they
  are runtime libraries, not Pi packages/resources; normal dependencies are the
  right packaging mechanism.
- Keep a separate global `npm:pi-mermaid` install — rejected: it can conflict
  with Firehorse's curated manifest and violates the one-install Firehorse UX.
