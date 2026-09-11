# DECISIONS.md

Project-wide binding decision log. Append-only. Each entry: ID, date,
decision, rationale, alternatives considered. Update an entry only if a later
project-wide decision supersedes it; record that as a new entry that references
the old.

Do not use this file as the default transcript for every `grill-with-docs` or
`create-plan` answer. Planning-session decisions belong in the owning Planning
Workspace at `docs/prds/prd-000N-<slug>/DECISIONS.md`. Promote a decision here
only when it sets cross-PRD policy, changes repository-wide architecture, or
would surprise future maintainers outside a single PRD. Durable codebase-facing
architecture, structure, convention, testing, integration, concern, and ADR
material belongs in `docs/codebase/` anchors when that is the more useful reader
entry point.

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

## D-22 — Phase 2 defines the Firehorse Definition Format

**Date:** 2026-05-15
**Decision:** Phase 2 will define a cross-provider Firehorse Definition Format
rather than a skill-only format. The format covers user-facing workflows and
their supporting skills / agent roles.
**Rationale:** Firehorse's user-facing abstraction is a workflow, not an
independent pile of skills. A skill-only format would optimize for the wrong
primitive and force workflow semantics to be retrofitted later. The name
"Firehorse Definition Format" avoids overloading the existing provider /
orchestrator capability language.
**Alternatives considered:**

- Skill format only — rejected: too narrow for Firehorse's workflow-centered
  model.
- Capability format — rejected: conflicts with provider/orchestrator capability
  terminology already used in the core contracts and architecture docs.

## D-23 — Memory upstreams stay runtime-owned by claude-mem

**Date:** 2026-05-15
**Decision:** Firehorse adds persistent memory by wiring two upstreams without
forking their runtime behavior: `firehorse-pi` bundles `pi-agent-memory@0.3.4`
from <https://github.com/ArtemisAI/pi-mem> and exposes only its Pi extension plus
`mem-search` skill; `firehorse-claude` declares a plugin dependency on pinned
`claude-mem@13.2.0` from <https://github.com/thedotmack/claude-mem>, exposed via
Firehorse's marketplace as a `git-subdir` source pointing at upstream `plugin/`.
Both upstreams get `UPSTREAM.json` provenance in core.
**Rationale:** Claude-Mem is a hook/MCP/worker runtime, not a static skill set.
Keeping it as an upstream-owned Claude plugin avoids copying generated worker
scripts into Firehorse, preserves upstream update semantics, and still gives
Firehorse users a one-install path. Pi gets the native package adapter while
sharing the same claude-mem worker, so memory can work across providers without a
Firehorse-authored memory runtime.
**Alternatives considered:**

- Merge claude-mem hooks, MCP server, worker scripts, and skills into the
  Firehorse Claude plugin — rejected: would fork a fast-moving runtime and
  create hook/MCP ownership conflicts.
- Ask Pi users to install `pi-agent-memory` separately — rejected: violates the
  curated one-install Firehorse Pi UX.
- Reimplement memory in Firehorse core — rejected: out of scope for the current
  no-runtime foundation and unnecessary while an upstream runtime exists.

## D-24 — Firehorse-authored workflows use the Firehorse Definition Format; upstream skills keep upstream shape

**Date:** 2026-05-15
**Decision:** Firehorse-authored workflows use the canonical Firehorse
Definition Format as their source of truth. Imported upstream skills and agent
sources keep their upstream-native shape and are mirrored into distribution
packages as curated external ingredients.
**Rationale:** Firehorse needs first-party workflows to stay consistent across
providers, but normalizing every upstream skill into a new intermediate format
would create churn, obscure provenance, and risk forking upstream semantics too
early. A hybrid model gives Firehorse-native workflows one authoring surface
while letting upstream-originated content remain auditable and updateable.
**Alternatives considered:**

- Canonicalize every upstream skill into Firehorse definitions — rejected:
  premature normalization and unnecessary maintenance burden.
- Treat provider-native files as the only source of truth — rejected: Firehorse-
  authored workflows would drift between Pi, Claude, and future distributions.

## D-25 — Firehorse definitions are declarative authoring contracts, not execution graphs

**Date:** 2026-05-15
**Decision:** The Phase 2 Firehorse Definition Format will describe workflow
intent and structure declaratively. It may include purpose, triggers, inputs,
supporting skills, agent roles, tool expectations, document expectations,
outputs, and safety gates, but it will not define a runnable DAG, branching
engine, or execution loop.
**Rationale:** Firehorse has not introduced a runtime, command layer, prompt
loader, or execution engine. The format still needs enough structure for Pi,
Claude, and future distributions to project consistent native files, but making
it executable now would violate the current no-runtime boundary and overfit
unvalidated orchestration semantics.
**Alternatives considered:**

- Executable workflow graph now — rejected: too much runtime commitment before
  Phase 2 has validated the authoring model.
- Mostly prose conventions — rejected: too weak to keep cross-provider
  projections consistent.

## D-26 — Canonical Firehorse-authored definitions live in firehorse-core

**Date:** 2026-05-15
**Decision:** Canonical Firehorse-authored definitions will live under
`packages/firehorse-core/definitions/`. Distribution packages project or mirror
those definitions into provider-native files.
**Rationale:** Firehorse-authored workflows need one cross-provider source of
truth. Keeping them in `firehorse-core` puts them beside the shared provider /
orchestrator contracts and the curated upstream source material, while still
keeping definitions as authoring content rather than runtime or execution code.
**Alternatives considered:**

- Repo-root `definitions/` — rejected: separates shared definitions from the
  package that already owns cross-provider source material.
- Distribution-local source files with sync tests — rejected: makes drift the
  default and relies on tests to rediscover it later.

## D-27 — Definition sources are organized by kind

**Date:** 2026-05-15
**Decision:** `packages/firehorse-core/definitions/` will be organized by
definition kind: `workflows/`, `skills/`, and `agent-roles/`.
**Rationale:** Skills and agent roles are reusable ingredients rather than
children of a single workflow. Kind-segregated directories make reuse,
reference-by-ID, and provider projection simpler than workflow-local bundles.
**Alternatives considered:**

- Workflow bundles — rejected: suggests supporting skills and agent roles are
  owned by one workflow, which undermines reuse.
- Single registry file — rejected: too centralized and awkward for prose-heavy
  authored definitions.

## D-28 — Workflows express provider-neutral orchestration intent

**Date:** 2026-05-15
**Decision:** Canonical workflow definitions may declare provider-neutral
orchestration intent, such as sequential phases, parallel review, role
coordination, inter-agent communication needs, or human approval gates. They must
not embed provider-specific orchestration recipes such as Pi subagent saved
chains or intercom wiring.
**Rationale:** Firehorse should leave room for Pi to project workflows onto
`pi-subagents` chains, parallel execution, async work, and intercom later,
without making those Pi-specific mechanisms part of the cross-provider source of
truth. Other distributions can project the same intent into their own native
capabilities.
**Alternatives considered:**

- No orchestration in canonical definitions — rejected: too little structure to
  guide consistent workflow projections.
- Pi-specific orchestration blocks — rejected: violates the cross-provider
  boundary and makes Pi the hidden canonical runtime.

## D-29 — Definition files are Markdown with frontmatter

**Date:** 2026-05-15
**Decision:** Each canonical Firehorse definition will be a Markdown file with
frontmatter, for example `WORKFLOW.md`, `SKILL.md`, or `AGENT-ROLE.md` inside
the relevant definition-kind directory.
**Rationale:** Firehorse definitions are prose-heavy authoring artifacts with a
small amount of structured metadata. Markdown with frontmatter matches Pi and
Claude ecosystem conventions, supports human review, and avoids introducing
runtime TypeScript objects or YAML-only prose awkwardness during the declarative
format phase.
**Alternatives considered:**

- YAML files — rejected: good for metadata but poor for long-form instructions
  and role guidance.
- TypeScript definition objects — rejected: makes authoring feel like runtime
  code before Firehorse has scoped a runtime.
- Single registry file — rejected: hard to review and edit as definitions grow.

## D-30 — Definition identity is explicit and path-validated

**Date:** 2026-05-15
**Decision:** Every canonical Definition File declares an explicit frontmatter
`id`, and that `id` must match the definition's directory path within its kind,
for example `definitions/workflows/diagnose-fix/WORKFLOW.md` declares
`id: diagnose-fix`.
**Rationale:** Explicit IDs make references and distribution projection readable,
while path validation makes renames intentional and reviewable. Either source of
identity alone is weaker: path-only IDs hide identity in storage, and metadata-
only IDs allow silent path drift.
**Alternatives considered:**

- Path-derived ID only — rejected: too implicit for cross-provider projection
  and human review.
- Frontmatter ID only — rejected: permits stale paths and ambiguous renames.

## D-31 — Definition IDs are globally unique across kinds

**Date:** 2026-05-15
**Decision:** Firehorse-authored Definition IDs are globally unique across
workflows, skills, and agent roles. The `kind` remains separate frontmatter
metadata and is not embedded into the ID.
**Rationale:** Provider projections can flatten resources into namespaces that
do not preserve Firehorse's kind directories. Global uniqueness prevents
collisions, keeps references simple, and avoids kind-prefix noise in user-facing
IDs.
**Alternatives considered:**

- Kind-scoped IDs — rejected: risks collisions when projecting to provider-
  native resources.
- Kind-prefixed IDs — rejected: over-encodes type information into identity and
  makes names noisier than necessary.

## D-32 — Workflow definitions use kind-specific reference lists

**Date:** 2026-05-15
**Decision:** Workflow Definition Files reference supporting definitions through
kind-specific lists such as `skills`, `agentRoles`, and `upstreamSkills`, rather
than through one generic typed reference list or prose-only references.
**Rationale:** Firehorse-authored Definition IDs are globally unique, so
kind-specific lists provide enough structure for validation and projection while
remaining easy for authors to read and write. Upstream skills stay in a separate
reference list because their upstream-native identifiers are not Firehorse-global
Definition IDs.
**Alternatives considered:**

- One typed `uses` list — rejected: more verbose than necessary for the common
  authoring case.
- Prose-only references — rejected: too weak for validation, projection, and
  dependency review.

## D-33 — Definition files split metadata frontmatter from a structured Markdown body

**Date:** 2026-05-15
**Decision:** Definition Files use a hybrid structure: frontmatter contains
identity, projection metadata, references, and concise discovery fields; the
Markdown body contains the richer structured instruction contract such as
purpose, usage guidance, inputs, outputs, orchestration intent, safety gates, and
projection notes.
**Rationale:** Provider projection and validation need some machine-readable
metadata, but workflows and roles are instruction-heavy. A strong Markdown body
structure helps agents follow instructions without forcing long-form guidance
into unreadable YAML.
**Alternatives considered:**

- Everything structured in frontmatter — rejected: too hard to read and review
  for prose-heavy workflow guidance.
- Mostly Markdown body — rejected: too weak for projection, validation, and
  dependency inspection.

## D-34 — Workflow bodies use standardized operational contract sections

**Date:** 2026-05-15
**Decision:** Every `WORKFLOW.md` Definition Body will use standardized
operational contract sections: `Purpose`, `When to use`, `Inputs`, `Outputs`,
`Supporting capabilities`, `Orchestration intent`, `Safety gates`, `Procedure`,
and `Projection notes`.
**Rationale:** Strong body structure gives agents predictable instruction
anchors and makes workflow behavior easier to review, adapt, and project across
providers. The sections stay declarative and instructional rather than defining a
runtime execution graph.
**Alternatives considered:**

- Minimal sections only — rejected: too little guidance for consistent agent
  behavior.
- Fully flexible sections per workflow — rejected: encourages drift and makes
  provider projection harder.

## D-35 — Definition body templates are kind-specific, with agent-role frontmatter based on pi-subagents

**Date:** 2026-05-15
**Decision:** `WORKFLOW.md`, `SKILL.md`, and `AGENT-ROLE.md` use kind-specific
body templates. Agent-role frontmatter starts from the documented `pi-subagents`
agent frontmatter as its compatibility basis. Firehorse-authored skills get
their own native template, while imported upstream `SKILL.md` files may keep
whatever frontmatter their source project uses.
**Rationale:** Workflows, reusable skills, and agent roles have different
instruction contracts. Reusing one body shape would blur those concepts. For
agent roles, `pi-subagents` already defines a practical frontmatter vocabulary
for name/package, description, tool/model selection, context inheritance,
injected skills, output/default reads, progress, interactivity, and delegation
depth; using it as the basis avoids inventing a parallel role schema while still
letting Firehorse keep provider-specific execution behavior in projections.
**Alternatives considered:**

- Same body sections for all definition kinds — rejected: workflows, skills,
  and agent roles need different instruction anchors.
- Strict workflow bodies with loose skill/role prose — rejected: too weak for
  reusable provider projections.
- Invent a fresh Firehorse-only agent-role frontmatter schema — rejected:
  unnecessary divergence from the existing `pi-subagents` role-agent format.

## D-36 — Agent-role frontmatter keeps the full pi-subagents field set as the canonical basis

**Date:** 2026-05-15
**Decision:** `AGENT-ROLE.md` frontmatter uses the documented `pi-subagents`
agent frontmatter field set as its canonical basis, plus Firehorse `id` and
`kind`. Distribution adapters, including Claude projections, filter or ignore
fields they cannot represent instead of splitting role metadata into separate
portable and Pi-specific frontmatter blocks.
**Rationale:** Keeping the complete role contract in one place makes definitions
easier to author, review, and keep in sync. Filtering unsupported fields during
projection is simpler and less error-prone than maintaining parallel frontmatter
layers for Pi-compatible and non-Pi-compatible role metadata.
**Alternatives considered:**

- Portable subset plus projection metadata — rejected: splits the role contract
  and makes Pi-compatible roles less complete at the source.
- Firehorse-native schema with a `pi-subagents` mapping — rejected: duplicates
  an already useful role-agent frontmatter vocabulary and increases adapter
  complexity.

## D-37 — Agent Roles project to Claude agents

**Date:** 2026-05-15
**Decision:** Firehorse `AGENT-ROLE.md` definitions project to Claude plugin
`agents/`, not Claude `skills/`. Firehorse `SKILL.md` definitions project to
Claude `skills/`.
**Rationale:** Firehorse keeps **Skill** and **Agent Role** distinct. Claude
already has separate plugin surfaces for reusable skills and specialist agents,
and D-15 already mirrors `pi-subagents` built-in agents into
`firehorse-claude/agents/`. Projecting roles to Claude agents preserves the
conceptual boundary and avoids turning role behavior into skill bundles.
**Alternatives considered:**

- Project Agent Roles to Claude skills — rejected: blurs the distinction between
  reusable instruction ingredients and specialist role agents.
- Project Agent Roles to both Claude agents and Claude skills — rejected: creates
  duplicate provider-native surfaces unless a later workflow specifically needs
  a paired helper skill.

## D-38 — Memory project identity is pinned from GitHub repo metadata

**Date:** 2026-05-15
**Decision:** Firehorse setup resolves the canonical memory project id with the
GitHub CLI (`gh repo view --json name --jq .name`), then passes or persists it
with `FIREHORSE_PROJECT_NAME`, `CLAUDE_MEM_PROJECT`, and `PI_MEM_PROJECT`.
Runtime helpers may use the Superset path segment
`/.superset/worktrees/<project>/` as a diagnostic suggestion, but must not infer
canonical identity from git worktree parent directories, git roots, or cwd
basenames.
**Rationale:** Superset and Conductor worktrees may be generated outside the
canonical repository root, so parent directories can point at a workspace
container rather than the repo memory namespace. GitHub repository metadata is
already the source of truth for Firehorse installs and yields the intended repo
name directly. Explicit non-secret env vars let main agents, Pi subagents,
Claude subagents, and the claude-mem worker all search and write under the same
stable project id.
**Alternatives considered:**

- Use claude-mem's default cwd/worktree-derived project names — rejected: splits
  memory across generated workspace names.
- Infer from git common-dir parent — rejected: not reliable for Conductor /
  Superset layouts where the canonical project is not a path parent.
- Ask users to pass `--memory-project` routinely — rejected: `gh repo view` is a
  simpler and less error-prone default; the flag remains a fallback.
- Make Superset path inference authoritative — rejected: useful for setup
  prompts, but GitHub metadata is safer and works for non-Superset orchestrators.

## D-39 — Strict skill templates apply only to Firehorse-authored skills

**Date:** 2026-05-15
**Decision:** Firehorse-authored `SKILL.md` definitions use a strict Firehorse
Definition Format template. Imported upstream skills remain upstream-shaped and
are mirrored/projected directly into Pi and Claude distribution surfaces as
curated external ingredients.
**Rationale:** Normalizing every upstream skill into Firehorse's strict template
would make upstream updates expensive: each upstream change would need semantic
analysis and patching into a Firehorse fork. Keeping upstream skills upstream-
shaped preserves cheap, auditable updates, while strict templates still give
Firehorse's own reusable skills consistency for workflow references and provider
projection.
**Alternatives considered:**

- Normalize all upstream skills into Firehorse-authored skill definitions —
  rejected: high maintenance overhead and unnecessary divergence from upstream.
- Let Firehorse-authored skills vary like upstream skills — rejected: weakens
  consistency for first-party workflow composition and projection.

## D-40 — Firehorse-authored skill bodies use a reusable instruction contract

**Date:** 2026-05-15
**Decision:** Every Firehorse-authored `SKILL.md` Definition Body will use a
reusable instruction contract: `Purpose`, `When to use`, `Inputs`, `Outputs`,
`Instructions`, `Boundaries`, `Examples`, and `Projection notes`.
**Rationale:** A Firehorse-authored skill is a reusable instruction ingredient,
not a mini-workflow. It needs clear invocation guidance, boundaries, examples,
and projection notes, but should not require workflow-specific sections such as
procedure or safety gates.
**Alternatives considered:**

- Workflow-lite contract — rejected: makes skills feel like smaller workflows
  and blurs the Skill / Workflow boundary.
- Minimal skill contract — rejected: too weak for consistent first-party skill
  composition and provider projection.

## D-41 — Agent-role bodies use a role contract

**Date:** 2026-05-15
**Decision:** Every `AGENT-ROLE.md` Definition Body will use a role contract:
`Mission`, `Responsibilities`, `Inputs`, `Outputs`, `Tools and permissions`,
`Decision authority`, `Escalation rules`, `Collaboration protocol`,
`Boundaries`, and `Projection notes`.
**Rationale:** Agent-role frontmatter captures runtime defaults, while the body
must capture the specialist's reasoning and collaboration contract. A structured
role contract makes Claude agent projection cleaner and keeps role behavior
reviewable without turning roles into workflows.
**Alternatives considered:**

- Pi-subagents-style freeform prompt — rejected: too loose for consistent
  cross-provider role projection.
- Workflow-ish structure — rejected: blurs agent roles with user-facing
  workflows.

## D-42 — Capability mismatches use provider-neutral requires and optional declarations

**Date:** 2026-05-15
**Decision:** Definition Files declare provider capability needs with provider-
neutral `requires` and `optional` frontmatter fields. These declarations may
cover tools, orchestration, modalities, or environment needs. Provider-specific
nuance belongs in the structured `Projection notes` body section.
**Rationale:** Validation, routing, and provider projection need machine-readable
signals for hard requirements and graceful enhancements. A full provider
compatibility matrix would bloat definitions and age quickly, while prose-only
notes are too weak for validation.
**Alternatives considered:**

- Provider compatibility matrix per definition — rejected: too verbose and
  likely to drift as provider capabilities change.
- Projection notes only — rejected: not machine-readable enough for validation
  or routing.

## D-43 — Capability vocabulary is documented but extension-friendly

**Date:** 2026-05-15
**Decision:** Firehorse capability declarations use documented common categories
and values for `tools`, `orchestration`, `modalities`, and `environment`, while
allowing extension-prefixed values such as `mcp:github` or
`provider:pi-subagents/intercom`.
**Rationale:** A small documented vocabulary enables validation and consistent
routing for common capabilities. Extension-prefixed values keep the format usable
for MCP tools, direct provider features, and future integrations without schema
churn.
**Alternatives considered:**

- Fully closed vocabulary now — rejected: too brittle while integrations and MCP
  surfaces are still evolving.
- Fully open strings — rejected: too weak for validation and consistent
  projection.

## D-44 — Phase 2 includes core schema, parser, and validator code

**Date:** 2026-05-15
**Decision:** Phase 2 will implement the Firehorse Definition Schema in
`firehorse-core`, including TypeScript schema types, a parser, and validation
helpers for canonical Definition Files.
**Rationale:** The definition format has enough invariants that docs alone are
unsafe: path/ID matching, globally unique IDs, kind-specific file names,
required body sections, reference fields, and capability declarations must not
silently drift. Schema and validation code are authoring safeguards, not a
runtime, prompt loader, provider transport, or execution engine.
**Alternatives considered:**

- Docs/examples only — rejected: too easy to break important format invariants.
- Lightweight checker script only — rejected: duplicates schema logic outside
  the core package and delays the API shape that future loader work will need.

## D-45 — Firehorse Definition Schema uses Zod

**Date:** 2026-05-15
**Decision:** `firehorse-core` will implement the Firehorse Definition Schema
with Zod and infer TypeScript types from those schemas.
**Rationale:** Zod has strong ergonomics for parser-level validation, gives the
core package inferred TypeScript types from the validation source of truth, and
is not tied to Pi's peer-dependency model. The workspace already uses Zod in the
Pi distribution, so this does not introduce an unfamiliar validation stack.
**Alternatives considered:**

- TypeBox — rejected: closer to Pi ecosystem conventions, but less ergonomic for
  parser-first validation and would couple the core schema choice to Pi-flavored
  dependencies.
- Manual TypeScript validators — rejected: avoids a dependency, but increases
  maintenance risk for a format the user explicitly does not want to break.

## D-46 — Firehorse definitions project to checked-in generated mirrors

**Date:** 2026-05-15
**Decision:** Firehorse-authored Definition Files project into checked-in
provider-native mirrors in `firehorse-pi` and `firehorse-claude`.
**Rationale:** Checked-in mirrors keep Pi and Claude installs self-contained,
match the existing adapter-mirror model, and avoid runtime definition loading.
They also make provider-native diffs reviewable during normal development.
**Alternatives considered:**

- Runtime loading from `firehorse-core/definitions/` — rejected: introduces a
  loader/runtime dependency before that work is scoped.
- Manual per-distribution ports — rejected: makes drift likely and wastes the
  schema/projection work.

## D-47 — Definition validation fails typecheck and CI

**Date:** 2026-05-15
**Decision:** Invalid canonical definitions or generated mirrors fail the
repository's normal typecheck/CI path.
**Rationale:** The definition format is important not to break. ID/path drift,
duplicate IDs, missing required sections, invalid references, unsupported
capability declarations, or stale generated mirrors should fail early rather than
surface during packaging or user sessions.
**Alternatives considered:**

- Local warnings only — rejected: too easy to ignore.
- Validate only during publish — rejected: too late in the feedback loop.

## D-48 — Phase 2 includes full Pi and Claude projection generation

**Date:** 2026-05-15
**Decision:** Phase 2 includes the full generator that projects Firehorse-
authored definitions into Pi and Claude provider-native resources.
**Rationale:** A projection generator is necessary to prove the Definition
Format actually maps to both supported distributions. Implementing it alongside
the schema avoids designing an abstract format that later cannot be projected
cleanly, while still avoiding runtime execution code.
**Alternatives considered:**

- Projection contracts only — rejected: insufficient proof that the format is
  implementable across Pi and Claude.
- Defer all projection to a later phase — rejected: increases the risk of schema
  churn after examples are written.

## D-49 — `diagnose-fix` is the first example workflow

**Date:** 2026-05-15
**Decision:** Phase 2 will define `diagnose-fix` as the first example workflow.
**Rationale:** Diagnosis has clear inputs, outputs, safety boundaries, reusable
upstream skills, and plausible supporting agent roles. It is concrete enough to
exercise workflow references, capability requirements, projection notes, and body
section validation without requiring an autonomous execution loop.
**Alternatives considered:**

- `plan-work` — rejected for the first example because planning semantics are
  broader and more likely to trigger unresolved product/process questions.
- `build-slice` — rejected for the first example because implementation and
  review policies depend on more downstream execution choices.
- `grill-plan` — rejected for the first example because this session is already
  using it to define the format, making it too self-referential as the initial
  fixture.

## D-50 — Generated mirrors include provenance headers

**Date:** 2026-05-15
**Decision:** Every generated provider-native mirror includes a provenance
header containing at least the source definition path, definition ID, generated
notice, and do-not-edit warning.
**Rationale:** Provenance headers prevent accidental hand edits to generated
mirrors and make provider-native files traceable back to canonical definitions
during review and debugging.
**Alternatives considered:**

- Minimal generated comment — rejected: too little information when debugging
  projection diffs.
- No generated marker — rejected: invites manual edits and obscures source of
  truth.

## D-51 — Workflow projections target Pi prompt templates and Claude commands

**Date:** 2026-05-15
**Decision:** Firehorse-authored Workflow definitions project to Pi prompt
templates and Claude plugin commands as their primary user-facing invocation
surfaces.
**Rationale:** Pi prompt templates are Markdown snippets invoked as slash-style
commands from package `prompts/` directories or `pi.prompts` manifest entries;
this is closer to Claude commands than Pi skills. Workflows are user-facing
invocations, while Firehorse-authored skills remain reusable instruction
ingredients that project to provider skill surfaces.
**Alternatives considered:**

- Pi skills plus Claude commands — rejected after checking Pi prompt-template
  docs; Pi prompt templates are the closer native analogue to Claude commands.
- Pi skills plus Claude skills — rejected: treats workflows as reusable skill
  ingredients rather than user-facing invocations.
- Generate both Claude command and Claude skill — rejected for now: duplicates
  the workflow surface and blurs Workflow / Skill.

## D-52 — Generated native resource names use the `horse-` prefix

**Date:** 2026-05-15
**Decision:** Generated provider-native resources use `horse-<definition-id>` as
their native name, while canonical Definition IDs remain unprefixed.
**Rationale:** The prefix avoids collisions in provider-native namespaces without
polluting canonical IDs. `horse-` is shorter than `firehorse-` while still being
recognizable as Firehorse-owned generated content.
**Alternatives considered:**

- Raw IDs — rejected: higher collision risk in user-facing slash-command and
  skill namespaces.
- Provider-specific naming — rejected: harder to trace mirrors back to canonical
  definitions consistently.

## D-53 — Projection writes only overwrite valid generated mirrors

**Date:** 2026-05-15
**Decision:** Projection scripts may overwrite an existing target file only when
it has a valid Firehorse provenance header for a generated mirror. If a target
file exists without that header, projection fails.
**Rationale:** Generated mirror updates should be safe and repeatable without
risking hand-authored provider files. Failing on unmarked files forces humans to
resolve ownership explicitly.
**Alternatives considered:**

- Always overwrite — rejected: unsafe for hand-authored distribution content.
- Skip existing files — rejected: hides stale generated mirrors.

## D-54 — Projection logic is pure in core; repo scripts perform file writes

**Date:** 2026-05-15
**Decision:** Projection logic lives as pure functions in `firehorse-core`; repo
scripts call those functions and perform filesystem writes for generated mirrors.
**Rationale:** Core should own schema-aware projection behavior, but file writes
are repository tooling, not runtime behavior. This keeps projection reusable and
testable while respecting the no-runtime boundary.
**Alternatives considered:**

- All projection logic in root scripts — rejected: scatters schema-aware logic
  outside the core package.
- Projection logic inside distribution packages — rejected: encourages Pi and
  Claude projection drift.

## D-55 — Definition checks run from root typecheck

**Date:** 2026-05-15
**Decision:** The repository exposes `pnpm definitions:check`, and root
`pnpm typecheck` includes definition validation and generated-mirror freshness
checks.
**Rationale:** Definition validity is part of repository correctness. Running it
from root typecheck makes ID/path mismatches, duplicate IDs, missing sections,
invalid references, unsupported capability declarations, and stale generated
mirrors fail in the normal CI feedback path.
**Alternatives considered:**

- Manual command only — rejected: too easy to forget.
- Package-local check only — rejected: generated mirrors span multiple packages,
  so the root workspace needs to validate the whole projection graph.

## D-56 — New-project support handles both greenfield and brownfield projects

**Date:** 2026-05-15
**Decision:** The Firehorse new-project adaptation supports both new projects
and existing projects. It detects existing long-lived project documents, fills
missing gaps, and never overwrites user-authored documents without asking.
**Rationale:** The original `fh:new-project` handled brownfield sync, and the
Firehorse adaptation should remain safe to run after a package update or on an
already-started repository. Filling gaps without destructive overwrites makes the
skill useful for both initialization and repair.
**Alternatives considered:**

- New projects only — rejected: too narrow for real adoption.
- Existing-project sync only — rejected: loses the bootstrap use case.

## D-57 — New-project starts as provider-native Pi and Claude skills

**Date:** 2026-05-15
**Decision:** Before the Firehorse Definition Format and projection generator
exist, the Firehorse new-project adaptation will be added as provider-native Pi
and Claude skills. It should later migrate to canonical Firehorse definitions
and generated mirrors.
**Rationale:** The workflow is immediately useful and can be implemented as
static provider-native skills without adding a runtime. Waiting for the full
Definition Format would delay a practical setup workflow; implementing only one
provider would undermine the cross-provider package goal.
**Alternatives considered:**

- Wait for the Definition Format and generator — rejected: delays a useful
  package feature that can be expressed as static skills today.
- Add only a Pi skill — rejected: the requested workflow must work for both Pi
  and Claude usage.

## D-58 — New-project canonical workflow ID is `new-project`; native invocation is `horse-new-project`

**Date:** 2026-05-15
**Decision:** The future canonical Firehorse Workflow ID for project bootstrap is
`new-project`. The provider-native invocation name is `horse-new-project`.
**Rationale:** Canonical Definition IDs stay unprefixed, while generated/native
resource names use the `horse-<id>` convention. This preserves the existing
naming rule and avoids a future `horse-horse-new-project` projection.
**Alternatives considered:**

- Canonical ID `horse-new-project` — rejected: conflicts with the generated name
  prefix convention.
- Longer native name `firehorse-new-project` — rejected: less consistent with the
  established `horse-` namespace.

## D-59 — New-project writes project anchors under docs

**Date:** 2026-05-15
**Decision:** `horse-new-project` creates or syncs durable project anchor docs
under `docs/`: `docs/PROJECT.md`, `docs/DESIGN.md`, and
`docs/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING,INTEGRATIONS,CONCERNS}.md`.
**Rationale:** The Firehorse adaptation should provide long-lived project and
codebase context without GSD. Keeping all anchors under `docs/` avoids root
clutter, separates design/product anchors from codebase maps, and gives future
workflows stable paths to consult.
**Alternatives considered:**

- Root `PROJECT.md` / `DESIGN.md` plus `docs/codebase/` — rejected: splits
  generated anchors across root and docs.
- Root `DESIGN.md` with `docs/PROJECT.md` — rejected: inconsistent ownership
  and harder for future workflows to discover.

## D-60 — Generated workflow mirrors contain fully rendered instructions

**Date:** 2026-05-15
**Decision:** Generated workflow mirrors contain the full rendered workflow
instructions needed by the provider-native surface, not just a reference to the
canonical Definition File.
**Rationale:** Pi and Claude installs must be self-contained and should not need
a runtime loader to chase canonical definition paths at invocation time. Full
rendering keeps generated prompt templates and commands usable as static package
content.
**Alternatives considered:**

- Thin wrapper that references the canonical definition path — rejected: implies
  runtime loading or repository-relative assumptions.
- Summary only — rejected: not enough instruction for provider-native execution.

## D-61 — Projection generation updates provider manifests

**Date:** 2026-05-15
**Decision:** Projection generation updates the relevant provider manifests, such
as Pi `prompts` exposure and Claude plugin command entries, so generated mirrors
are actually discoverable by installed distributions.
**Rationale:** A generated file that is not exposed by the package/plugin is a
broken projection. Manifest updates should be generated from the same source of
truth as the files to avoid manual drift.
**Alternatives considered:**

- Human-maintained manifest updates — rejected: easy to forget and undermines
  generated mirrors.
- Check-only manifest validation — rejected for Phase 2 because full projection
  generation is in scope.

## D-62 — Generated mirrors carry provenance in frontmatter and an HTML comment

**Date:** 2026-05-15
**Decision:** Generated mirrors include machine-readable provenance frontmatter
and a human-visible HTML comment containing the generated notice, do-not-edit
warning, source definition path, and definition ID.
**Rationale:** Frontmatter supports validation and freshness checks; an HTML
comment is immediately visible to humans reviewing or opening the generated
Markdown file.
**Alternatives considered:**

- HTML comment only — rejected: less convenient for validator/projection tools.
- Frontmatter only — rejected: easier for humans to miss.

## D-63 — Workflow invocation arguments are declared in frontmatter

**Date:** 2026-05-15
**Decision:** Workflow Definition Files declare invocation argument hints in
frontmatter for projection into provider-native command/template UX.
**Rationale:** Pi prompt templates expose `argument-hint`, and Claude commands
have analogous invocation metadata. Keeping the hint structured avoids trying to
infer user-facing arguments from the `Inputs` body section.
**Alternatives considered:**

- Infer arguments from body sections — rejected: brittle and hard to project.
- No structured arguments — rejected: worse autocomplete and invocation UX.

## D-64 — Generated mirrors are not hand-editable

**Date:** 2026-05-15
**Decision:** Generated mirrors are deterministic outputs. Emergency fixes must
be made in the canonical Definition File and regenerated, not patched directly in
the provider-native mirror.
**Rationale:** Allowing manual edits would make generated mirrors drift from
canonical definitions and weaken freshness checks. Deterministic generation keeps
source of truth clear.
**Alternatives considered:**

- Preserve marked manual regions — rejected: complicates projection and creates
  ambiguous ownership.
- Manual edits win — rejected: defeats the generated mirror model.

## D-65 — New-project does not create planning state

**Date:** 2026-05-15
**Decision:** `horse-new-project` creates durable `docs/` project anchors and
cross-provider agent guidance, but it does not create `.planning/` or GSD state.
**Rationale:** The Firehorse adaptation is for long-lived project knowledge, not
GSD process tracking. Avoiding `.planning/` keeps the workflow lightweight and
separate from sprint/roadmap machinery.
**Alternatives considered:**

- Create minimal `.planning/STATE.md` / `DECISIONS.md` — rejected: reintroduces
  process state the user explicitly does not want here.
- Only create `.planning/` when already present — rejected: makes the workflow's
  ownership ambiguous.

## D-66 — New-project updates AGENTS.md as the canonical agent guidance file

**Date:** 2026-05-15
**Decision:** `horse-new-project` generates or updates `AGENTS.md` as the
cross-provider project guidance file. It does not make `CLAUDE.md` the canonical
source.
**Rationale:** Firehorse is cross-provider and this repo already treats
`AGENTS.md` as canonical, with provider-specific files deferring to it when they
exist.
**Alternatives considered:**

- Generate both `AGENTS.md` and `CLAUDE.md` — rejected: increases drift risk and
  makes Claude-specific guidance look canonical.
- Do not touch agent guidance files — rejected: future agent sessions need a
  stable project-entry contract.

## D-67 — New-project uses product discovery, optional brand and setup guidance, and no observability setup

**Date:** 2026-05-15
**Decision:** `horse-new-project` runs a lightweight product/business discovery
interview to understand the vision, target users, problem, value proposition,
and setup needs. It asks whether the user wants to define brand/design through
Impeccable now or defer it. Based on the interview, it may suggest starter app,
hosting, database/auth, or dependency setup in non-technical language. It does
not set up Sentry or observability.
**Rationale:** The useful part of the original `fh:new-project` is the guided
project-shaping conversation, not the GSD or observability machinery. Technical
setup should be framed as understandable product infrastructure choices rather
than tool jargon.
**Alternatives considered:**

- Bring over only static document generation — rejected: misses the product
  discovery value of the original workflow.
- Bring over full infra and observability setup — rejected: too heavy and keeps
  unwanted Sentry/observability assumptions.

## D-68 — GitHub CLI authentication is the hard external prerequisite for new-project

**Date:** 2026-05-15
**Decision:** `horse-new-project` requires GitHub CLI (`gh`) to be installed and
authenticated before the grill/planning flow completes.
**Rationale:** The downstream Firehorse flow needs to create GitHub issues after
product discovery and documentation. Making `gh` the hard prerequisite gives the
workflow a reliable issue-tracker target without requiring GSD.
**Alternatives considered:**

- Treat GitHub as optional — rejected: downstream issue creation is part of the
  required handoff from discovery to work.
- Support arbitrary issue trackers immediately — rejected: broader integration
  work can come later.

## D-69 — Brownfield new-project mode analyzes code before asking

**Date:** 2026-05-15
**Decision:** In brownfield projects, `horse-new-project` inspects existing
package files, source tree, tests, configs, and docs before asking the user, then
uses that analysis to populate missing `docs/codebase/` anchors.
**Rationale:** If the answer can be found in the codebase, the workflow should
explore instead of asking. This keeps the user interview focused on product and
business decisions that cannot be inferred from files.
**Alternatives considered:**

- Ask the user for every section — rejected: wastes user time and produces less
  accurate codebase documentation.
- Analyze only behind a flag — rejected: brownfield analysis should be the
  default safe behavior.

## D-70 — New-project writes resolved documents incrementally

**Date:** 2026-05-15
**Decision:** `horse-new-project` writes or updates each project anchor as soon
as the relevant decisions are resolved, instead of waiting until the end of the
whole interview.
**Rationale:** Incremental writes preserve resolved context and match the
Firehorse grilling pattern of capturing decisions while they are fresh.
**Alternatives considered:**

- Ask all questions and write all docs at the end — rejected: higher risk of
  losing detail and harder to resume.
- Create empty placeholder docs first — rejected: creates low-signal files and
  makes completion state ambiguous.

## D-71 — Pi Agent Role mirrors are synced by explicit setup

**Date:** 2026-05-15
**Decision:** Firehorse-generated Pi Agent Role mirrors are synced by explicit
`firehorse-setup` into the user's Pi agent directory, such as
`~/.pi/agent/agents/horse-*.md`.
**Rationale:** `pi-subagents` discovers agent files from builtin, user, and
project agent directories; it does not read Pi package manifest agent entries.
An explicit setup sync avoids runtime mutation during every session and avoids
forking or patching the bundled `pi-subagents` runtime.
**Alternatives considered:**

- Do not project Agent Roles to Pi until package agent dirs exist — rejected:
  leaves Pi without the canonical Firehorse roles.
- Patch bundled `pi-subagents` builtins — rejected: forks upstream runtime
  behavior and complicates updates.

## D-72 — Workflow mirrors reference supporting capabilities without inlining every body

**Date:** 2026-05-15
**Decision:** Generated workflow mirrors include the rendered workflow
instructions plus structured references and instructions for using supporting
Firehorse skills, Agent Roles, and Upstream Skills. They do not inline every
supporting skill, role, or upstream body into each workflow mirror.
**Rationale:** Inlining all supporting bodies would duplicate upstream and role
content, make updates painful, and bloat generated commands/templates. Structured
references keep workflows self-contained enough to guide the agent while leaving
supporting capabilities as separately installed/generated resources.
**Alternatives considered:**

- Inline all supporting bodies — rejected: duplicates content and increases
  update overhead.
- Only list supporting IDs — rejected: too weak to guide provider-native use.

## D-73 — Projection updates package-local and repo-root manifests

**Date:** 2026-05-15
**Decision:** Projection generation updates both distribution package-local
manifests and repo-root install manifests for generated resources.
**Rationale:** Firehorse supports package-local npm/plugin installs and repo-root
GitHub installs. Both entry points must expose the same generated workflows,
skills, and roles or users will see different surfaces depending on install
path.
**Alternatives considered:**

- Package-local manifests only — rejected: breaks repo-root GitHub install
  parity.
- Repo-root manifests only — rejected: breaks package-local install/publish
  parity.

## D-74 — Definition IDs are stable public API

**Date:** 2026-05-15
**Decision:** Canonical Definition IDs are stable public API. Renames require
explicit alias or deprecation handling rather than silent ID changes.
**Rationale:** IDs drive generated native names, references, provenance,
freshness checks, and user-facing command/template names. Changing an ID without
migration semantics breaks references and installed muscle memory.
**Alternatives considered:**

- IDs may change freely until runtime exists — rejected: generated mirrors and
  user-facing invocations already depend on them.
- Only workflow IDs are stable — rejected: skill and role references also depend
  on stable IDs.

## D-75 — Generated mirrors include source content hashes

**Date:** 2026-05-15
**Decision:** Generated mirror provenance includes a source content hash used by
freshness checks.
**Rationale:** A content hash gives deterministic stale-mirror detection that is
stronger than timestamps, paths, or IDs alone.
**Alternatives considered:**

- Path, ID, and timestamp only — rejected: timestamps are noisy and path/ID do
  not prove content freshness.
- CI-only hash bookkeeping — rejected: keeping the hash in the generated file
  makes local and CI freshness checks use the same evidence.

## D-76 — New-project uses the bundled Impeccable skill for optional brand definition

**Date:** 2026-05-15
**Decision:** `horse-new-project` asks whether the user wants to define brand and
design now using the existing bundled `impeccable` skill. If not, it records how
to run Impeccable later and may leave `docs/DESIGN.md` absent or marked as
not-yet-defined.
**Rationale:** Firehorse already bundles Impeccable. Creating a wrapper or
referring to a nonexistent `teach-impeccable` skill would add indirection without
improving the first implementation.
**Alternatives considered:**

- Create a `horse-brand-design` wrapper now — deferred: useful later if the
  brand workflow needs Firehorse-specific structure.
- Refer to `teach-impeccable` — rejected: no such skill exists in the package.

## D-77 — Codebase mapping is reusable as `horse-map-codebase`

**Date:** 2026-05-15
**Decision:** Firehorse will add reusable provider-native `horse-map-codebase`
behavior for producing `docs/codebase/` anchors. `horse-new-project` invokes that
behavior in brownfield mode instead of burying all codebase mapping logic inside
new-project only.
**Rationale:** Codebase mapping is useful beyond project initialization and is a
natural reusable workflow. Keeping it separate lets existing projects refresh
architecture, structure, conventions, testing, integrations, and concerns docs
without rerunning product discovery.
**Alternatives considered:**

- Keep mapping internal to `horse-new-project` — rejected: less reusable and
  harder to refresh independently.
- Defer mapping until the future Definition Format — rejected: brownfield
  new-project needs it now.

## D-78 — New-project may run full starter and infra automation with explicit opt-in, excluding observability

**Date:** 2026-05-15
**Decision:** If the user explicitly opts in, `horse-new-project` may run starter
template, Vercel hosting, Supabase database/auth, and dependency setup
automation. It must explain each step in non-technical language and must not run
Sentry or observability setup. D-78 supersedes D-67's setup-suggestion-only
boundary.
**Rationale:** The user wants the workflow to be capable of taking a project
from product discovery into a starting codebase and hosted/database-backed setup,
while keeping observability out of scope. Explicit opt-in keeps this powerful
path from surprising users.
**Alternatives considered:**

- Suggest setup only and create issues — rejected: too passive for users who are
  ready to scaffold immediately.
- Run starter setup only and defer hosting/database to issues — rejected: less
  useful for the desired bootstrap path.

## D-79 — New-project uses `cinjoff/fh-starter-project` as the default starter template

**Date:** 2026-05-15
**Decision:** When starter scaffolding is selected, `horse-new-project` uses
`cinjoff/fh-starter-project` as the default GitHub template, with an explanation
and opt-out.
**Rationale:** The original workflow already uses this template and it provides a
known good Next.js-oriented starting point. A default keeps the non-technical
setup conversation concrete while still allowing users to decline.
**Alternatives considered:**

- Ask for a template repository every time — rejected: adds friction and assumes
  users know what template they want.
- No default template — rejected: makes setup guidance less actionable.

## D-80 — Missing GitHub CLI authentication blocks issue creation, not project anchors

**Date:** 2026-05-15
**Decision:** `horse-new-project` should check GitHub CLI authentication early,
but missing or unauthenticated `gh` does not block product discovery or writing
project anchors. It blocks GitHub issue creation until fixed. D-80 supersedes
D-68's stronger completion-blocking wording.
**Rationale:** The hard dependency on GitHub exists because downstream planning
creates issues, but documentation work remains useful even before GitHub auth is
ready. This gives users progress while making the blocked handoff explicit.
**Alternatives considered:**

- Stop at the start if `gh auth status` fails — rejected: unnecessarily blocks
  durable documentation.
- Treat GitHub as optional — rejected: issue creation remains part of the
  required downstream workflow.

## D-81 — Phase 2 first implementation slice is full end-to-end definition projection

**Date:** 2026-05-15
**Decision:** The Phase 2 first implementation slice includes the full schema,
parser, validator, all three definition kinds, Pi/Claude projection generation,
manifest updates, freshness checks, and the `diagnose-fix` fixture.
**Rationale:** A complete end-to-end slice proves that the Firehorse Definition
Format can validate and project across both supported distributions without
building a runtime. A narrower slice would leave too many projection assumptions
untested.
**Alternatives considered:**

- Schema/parser/validator first, projection later — rejected: delays the proof
  that the schema maps cleanly to Pi and Claude.
- Workflow schema/projection only — rejected: misses the supporting skill and
  agent-role relationships that make workflows useful.

## D-82 — Frontmatter parsing uses gray-matter with Zod validation

**Date:** 2026-05-15
**Decision:** Firehorse Definition Files are parsed with `gray-matter`, then
validated with the Zod-backed Definition Schema.
**Rationale:** `gray-matter` is a well-known Markdown frontmatter parser that
keeps parsing concerns small and boring, while Zod remains the validation source
of truth. This avoids custom parsing bugs without making the schema depend on a
runtime loader.
**Alternatives considered:**

- Custom frontmatter splitter plus YAML parser — rejected: more code to own for
  little benefit.
- Custom parser with no dependency beyond Zod — rejected: too much parsing risk
  for a format the project wants to keep stable.

## D-83 — Upstream skill references are structured objects

**Date:** 2026-05-15
**Decision:** Workflow `upstreamSkills` entries use object references with
separate `upstream` and `id` fields.
**Rationale:** Structured references are easier to validate against upstream
metadata and clearer in review than colon-delimited strings. They also avoid
coupling canonical definitions to filesystem paths.
**Alternatives considered:**

- String references such as `mattpocock-skills:diagnose` — rejected: compact but
  less explicit and harder to extend.
- Filesystem path references — rejected: leaks repository layout into the
  authoring model and is brittle under upstream mirror changes.

## D-84 — Definition aliases and deprecations live in frontmatter

**Date:** 2026-05-15
**Decision:** Definition renames and deprecations are declared in Definition File
frontmatter with fields such as `aliases`, `deprecated`, and `replacedBy`.
**Rationale:** Alias and deprecation semantics belong beside the stable ID they
modify and should be schema-validatable. Changelog-only records are useful for
release notes but not enough for projection, validation, or reference resolution.
**Alternatives considered:**

- Separate alias registry file — rejected: splits identity metadata away from
  the definition it describes.
- Changelog or decision docs only — rejected: not machine-readable enough for
  validation and projection.

## D-85 — Generated manifest entries are sorted deterministically

**Date:** 2026-05-15
**Decision:** Generated manifest entries are sorted deterministically by native
path/name.
**Rationale:** Stable ordering keeps generated diffs small and reviewable.
**Alternatives considered:**

- Preserve generation order — rejected: can change with traversal or insertion
  order and creates noisy diffs.
- Append only — rejected: accumulates stale ordering and makes generated manifests
  harder to verify.

## D-86 — New-project and map-codebase wait for the Definition Format generator

**Date:** 2026-05-15
**Decision:** `horse-new-project` and `horse-map-codebase` should be implemented
through the Firehorse Definition Format and projection generator rather than as
hand-authored provider-native skills first. D-86 supersedes D-57.
**Rationale:** Once full projection generation is in scope, hand-authoring the
same workflows directly in Pi and Claude would create throwaway work and a drift
risk. Waiting for the generator keeps these workflows aligned with the emerging
canonical model.
**Alternatives considered:**

- Add hand-authored Pi and Claude skills immediately — rejected: duplicates the
  generator path and would need migration soon after.
- Add only `horse-new-project` before `horse-map-codebase` — rejected: brownfield
  setup needs reusable codebase mapping.

## D-87 — External setup commands require per-command confirmation

**Date:** 2026-05-15
**Decision:** `horse-new-project` must ask for explicit confirmation before each
external mutation command, including GitHub repository creation, starter overlay,
hosting setup, database/auth setup, dependency installation, and environment-file
writes.
**Rationale:** These actions can create remote resources, change local files, or
write secrets. Per-command confirmation keeps the workflow safe even after the
user opts into the overall setup path.
**Alternatives considered:**

- One confirmation at the start — rejected: too broad for a multi-step setup
  that may touch different systems.
- Run all selected commands after setup opt-in — rejected: too surprising for
  remote and secret-affecting operations.

## D-88 — New-project drafts issues before creating them

**Date:** 2026-05-15
**Decision:** After discovery and anchor creation, `horse-new-project` drafts the
proposed GitHub issues, asks for approval, and only then runs `gh issue create`.
**Rationale:** Issue creation is a durable external mutation and should reflect
the user's priorities after reviewing the proposed work breakdown.
**Alternatives considered:**

- Automatically create issues when `gh` works — rejected: too much external
  mutation without review.
- Only write issue drafts to docs — rejected: loses the desired handoff into
  GitHub-backed work tracking.

## D-89 — New-project edits only a marked Firehorse section in AGENTS.md

**Date:** 2026-05-15
**Decision:** If `AGENTS.md` already exists, `horse-new-project` may create or
update only a clearly marked Firehorse Project Anchors section. It must not
rewrite the whole file.
**Rationale:** Existing agent guidance often contains important project-specific
rules. A marked section gives Firehorse a safe update surface without taking
over the user's file.
**Alternatives considered:**

- Rewrite the whole file — rejected: high risk of deleting existing guidance.
- Leave `AGENTS.md` untouched — rejected: future sessions need a stable pointer
  to the generated project anchors.

## D-90 — Map-codebase prefers delegation with single-agent fallback

**Date:** 2026-05-15
**Decision:** `horse-map-codebase` should prefer provider delegation when
available, such as Pi subagents or Claude agents, and fall back to single-agent
analysis when delegation is unavailable.
**Rationale:** Parallel/specialized analysis can produce better codebase maps,
but requiring subagents would make the workflow less portable and less robust.
**Alternatives considered:**

- Always single-agent analysis — rejected: misses useful provider-native
  delegation when available.
- Always require subagents — rejected: too brittle across providers and setups.

## D-91 — Starter setup defaults to a private repo and preserves existing files

**Date:** 2026-05-15
**Decision:** Starter setup defaults to creating a private GitHub repository from
`cinjoff/fh-starter-project` only when the current directory is not already an
existing repository. In existing repositories, starter files may be overlaid into
the current folder only with confirmation, preserving existing files on top
rather than discarding them.
**Rationale:** New projects should start private by default, but many users will
run `horse-new-project` inside an existing repository. The starter path must not
clobber existing work.
**Alternatives considered:**

- Always create a new repo — rejected: wrong for brownfield or already-created
  projects.
- Ask public/private every time — rejected: private is the safer default, with
  opt-out available.
- Replace current contents with starter files — rejected: destructive.

## D-92 — Codebase anchors are created only when code exists

**Date:** 2026-05-15
**Decision:** `horse-new-project` should not create `docs/codebase/*` anchors
until an actual codebase exists or starter setup has run. Product and design
anchors may exist before code; codebase anchors should not be planned
placeholders.
**Rationale:** Codebase maps describe real code structure, conventions, tests,
integrations, and concerns. Creating aspirational placeholders would make future
agents trust documents that do not reflect reality.
**Alternatives considered:**

- Create planned placeholders for every codebase doc — rejected: low-signal and
  misleading before code exists.
- Create only intended architecture — rejected: blurs product planning with
  codebase mapping.

## D-93 — Starter overlay conflicts preserve existing files

**Date:** 2026-05-15
**Decision:** When overlaying starter files into an existing repository, existing
files win by default. The workflow writes a conflict report and asks before
replacing anything.
**Rationale:** Existing repositories contain user work and project-specific
configuration. Preserving existing files avoids accidental loss and makes
conflicts explicit.
**Alternatives considered:**

- Ask per conflicting file during the initial overlay — rejected: too noisy for
  large templates; a report gives a better review surface.
- Backup and overwrite — rejected: still destructive and easy to miss.

## D-94 — Secret env files require gitignore confirmation

**Date:** 2026-05-15
**Decision:** `horse-new-project` writes `.env.local` only after confirming it is
gitignored. If that cannot be confirmed, it writes or updates `.env.example` and
explains the manual secret step instead.
**Rationale:** Supabase and auth setup can produce secrets. The workflow must not
risk committing credentials while still helping users understand required local
environment variables.
**Alternatives considered:**

- Always write `.env.local` — rejected: unsafe without verified gitignore
  coverage.
- Never write env files — rejected: unnecessarily manual for safe local setup.

## D-95 — New-project issue drafting follows to-prd and to-issues patterns

**Date:** 2026-05-15
**Decision:** `horse-new-project` drafts both setup/infrastructure tasks and
product vertical-slice issues, using the bundled `to-prd` and `to-issues`
patterns as references. It groups issues with approved labels and milestones.
**Rationale:** `to-prd` publishes PRD context to the issue tracker, while
`to-issues` turns plans into tracer-bullet vertical slices that are ready for
agents. New-project should bridge product discovery into the same GitHub-backed
work style instead of inventing a parallel issue format.
**Alternatives considered:**

- Create setup issues only — rejected: loses the product handoff.
- Create product issues only — rejected: ignores necessary bootstrap work.

## D-96 — New-project asks before creating labels and milestones

**Date:** 2026-05-15
**Decision:** `horse-new-project` proposes a small default label set and an MVP
milestone, asks for approval, then creates them if GitHub auth works. The label
proposal should align with existing repo labels and Matt Pocock skill
expectations, including the `ready-for-agent` triage label used by `to-prd` /
`to-issues`.
**Rationale:** Labels and milestones make generated issues more useful, but they
are repository-level metadata and should not be created without review. Aligning
with the existing engineering skills prevents duplicate or incompatible triage
vocabularies.
**Alternatives considered:**

- Plain issues only — rejected: loses useful routing and milestone context.
- Create labels only when none exist — rejected: existing repos may still need
  missing Firehorse/triage labels.

## D-97 — New-project uses medium-depth product discovery

**Date:** 2026-05-15
**Decision:** `horse-new-project` runs product discovery until the vision, target
users, problem, value proposition, and success criteria are crisp enough to write
`docs/PROJECT.md` and draft issues.
**Rationale:** A lightweight 5-8 question pass may be too shallow for meaningful
project anchors, while a full strategy grilling session would delay setup too
much. Medium-depth discovery balances clarity and momentum.
**Alternatives considered:**

- Lightweight fixed-question pass — rejected: may leave core product language
  vague.
- Deep product strategy grilling before docs — rejected: too heavy for an
  initialization workflow.

## D-98 — `diagnose-fix` references the upstream diagnose skill

**Date:** 2026-05-15
**Decision:** The initial `diagnose-fix` workflow fixture references the upstream
`mattpocock-skills` `diagnose` skill through an `upstreamSkills` object
reference.
**Rationale:** The upstream skill already captures strong diagnosis practice.
Referencing it preserves upstream provenance and updateability while letting the
Firehorse workflow coordinate it with Firehorse-native structure.
**Alternatives considered:**

- Port the upstream skill into a Firehorse-authored skill — rejected: creates an
  unnecessary fork and update burden.
- Ignore upstream and write diagnosis guidance from scratch — rejected: wastes
  existing curated content.

## D-99 — `feedback-loop` is the first supporting Firehorse-authored skill

**Date:** 2026-05-15
**Decision:** The initial `diagnose-fix` fixture includes a Firehorse-authored
supporting skill with ID `feedback-loop`.
**Rationale:** A reproducible feedback loop and regression test are reusable
across diagnosis, build, and review workflows. This gives the first fixture a
small Firehorse-native skill without duplicating the upstream diagnose skill.
**Alternatives considered:**

- `root-cause-analysis` — rejected for the first fixture because upstream
  diagnose already covers much of the hypothesis/instrumentation loop.
- `patch-minimizer` — rejected for the first fixture because scoped fixes are
  better enforced by workflow gates and review role first.

## D-100 — `diagnostic-reviewer` is the first supporting Agent Role

**Date:** 2026-05-15
**Decision:** The initial `diagnose-fix` fixture includes an Agent Role with ID
`diagnostic-reviewer`.
**Rationale:** A reviewer role that verifies root cause, regression test, and fix
scope provides more safety for the first projection fixture than a reproducer or
implementer role alone.
**Alternatives considered:**

- `bug-reproducer` — rejected: useful, but narrower than the first safety role.
- `fix-implementer` — rejected: too implementation-heavy before mutation gates
  are proven.

## D-101 — `horse-diagnose-fix` accepts a freeform bug description

**Date:** 2026-05-15
**Decision:** The generated `horse-diagnose-fix` invocation accepts a freeform bug
description, optionally including an issue URL, log excerpt, failing test name,
or reproduction notes.
**Rationale:** Diagnosis starts from many shapes of evidence. Requiring only a
GitHub issue URL would be too narrow, while no arguments would make the workflow
less convenient for common cases.
**Alternatives considered:**

- Required GitHub issue URL — rejected: excludes local bugs, failing tests, and
  log-only reports.
- No arguments; always ask interactively — rejected: worse for users who already
  know the bug context.

## D-102 — `diagnose-fix` mutates code only behind a regression-loop and scope gate

**Date:** 2026-05-15
**Decision:** `diagnose-fix` may patch code only when the bug scope is clear and
a reproduction/regression loop exists. Otherwise it asks for approval or produces
a diagnosis report instead of mutating code.
**Rationale:** Bug fixing without a feedback loop risks speculative changes and
regressions. The gate keeps the workflow useful while preserving safety.
**Alternatives considered:**

- Diagnose and patch directly by default — rejected: too risky without a proven
  loop.
- Report only — rejected: too passive when the loop and scope are already clear.

## D-103 — Definition Files require `schemaVersion`

**Date:** 2026-05-15
**Decision:** Every Firehorse Definition File declares a required `schemaVersion`
frontmatter field.
**Rationale:** The format is expected to evolve. A required schema version makes
parsing, validation, migration, and projection behavior explicit instead of
inferring it from package versions.
**Alternatives considered:**

- Infer from package version — rejected: package versions and file schema
  versions evolve for different reasons.
- Optional until v1 — rejected: encourages unversioned files before the format is
  stable.

## D-104 — Generated files live under provider-native `firehorse/` folders

**Date:** 2026-05-15
**Decision:** Generated files live under provider-native `firehorse/` folders:
Pi workflows in `packages/firehorse-pi/prompts/firehorse/horse-*.md`, Claude
workflows in `packages/firehorse-claude/commands/firehorse/horse-*.md`, Pi skills
in `packages/firehorse-pi/skills/firehorse/<id>/SKILL.md`, Claude skills in
`packages/firehorse-claude/skills/firehorse/<id>/SKILL.md`, and Claude agents in
`packages/firehorse-claude/agents/firehorse/horse-*.md`.
**Rationale:** A `firehorse/` folder makes generated ownership obvious without
using the generic name `generated`. It keeps generated files grouped while still
landing in each provider's native resource tree.
**Alternatives considered:**

- Flat generated directories per package — rejected: less aligned with provider
  resource conventions.
- Mixing generated files into existing top-level directories — rejected: harder
  to distinguish generated mirrors from hand-authored or upstream mirrors.

## D-105 — Projection removes stale generated mirrors

**Date:** 2026-05-15
**Decision:** Projection removes stale generated mirrors when they have valid
Firehorse provenance and their canonical source no longer exists.
**Rationale:** Stale generated files can expose removed workflows or skills.
Restricting removal to files with valid provenance protects hand-authored
provider files while keeping generated surfaces fresh.
**Alternatives considered:**

- Leave stale files — rejected: causes confusing installed surfaces.
- Warn only — rejected: allows stale generated mirrors to accumulate.

## D-106 — Generated mirrors preserve canonical headings where possible

**Date:** 2026-05-15
**Decision:** Generated mirrors preserve canonical Markdown headings where
possible, adding only provider-specific frontmatter and provenance wrappers.
**Rationale:** Keeping headings stable makes generated files easy to compare with
canonical definitions and preserves the strong instruction structure designed for
agent behavior.
**Alternatives considered:**

- Rewrite headings to provider-specific structure — rejected: makes diffs and
  traceability worse unless a provider requires it.
- Flatten into one prompt — rejected: loses instruction anchors.

## D-107 — Definition format docs include full canonical examples

**Date:** 2026-05-15
**Decision:** `docs/FIREHORSE-DEFINITION-FORMAT.md` includes complete canonical
examples for `diagnose-fix`, `feedback-loop`, and `diagnostic-reviewer`.
**Rationale:** Full examples are necessary to show how frontmatter, body
sections, references, capability requirements, and projection notes fit together.
Snippets are not enough to guide authors or validate the first implementation.
**Alternatives considered:**

- Snippets only — rejected: too easy to miss interactions between fields.
- Examples only on disk — rejected: the format document should be usable as the
  authoritative authoring guide.

## D-108 — `schemaVersion` is an integer starting at 1

**Date:** 2026-05-15
**Decision:** Definition File `schemaVersion` values are integers, starting with
`1`.
**Rationale:** Integer schema versions are simple to compare and migrate, and
avoid coupling file format compatibility to package release semver.
**Alternatives considered:**

- Semver string — rejected: too tied to package release cadence.
- Date string — rejected: less useful for parser/migration branching.

## D-109 — `zod` and `gray-matter` are normal firehorse-core dependencies

**Date:** 2026-05-15
**Decision:** `zod` and `gray-matter` are normal `firehorse-core` dependencies,
not dev dependencies or peers.
**Rationale:** The parser and validator are exported core APIs, so consumers who
import them need the validation stack at runtime. Peer dependencies would push
schema plumbing onto consumers, and dev dependencies would break published parser
usage.
**Alternatives considered:**

- Dev dependencies only — rejected: exported parser/validator code would not have
  its runtime dependencies in published installs.
- Peer dependencies — rejected: unnecessary consumer burden for core-owned
  validation internals.

## D-110 — Generated mirror freshness uses SHA-256 source hashes

**Date:** 2026-05-15
**Decision:** Generated mirror provenance stores a SHA-256 hash of the canonical
Definition File content.
**Rationale:** SHA-256 is deterministic, portable, and independent of git state.
It makes stale mirror checks stronger than path/ID/timestamp metadata.
**Alternatives considered:**

- Git blob hash — rejected: ties freshness checks to git plumbing and staged
  state.
- Timestamp plus file size — rejected: noisy and weaker than content hashing.

## D-111 — Projection exposes write and check modes

**Date:** 2026-05-15
**Decision:** The repository exposes both `definitions:write` and
`definitions:check` scripts. Write mode updates generated mirrors and manifests;
check mode fails when generated output is stale or invalid.
**Rationale:** Authors need an explicit command to regenerate mirrors, and CI
needs a non-mutating command to enforce freshness.
**Alternatives considered:**

- Check only — rejected: leaves authors without the canonical update command.
- Write only — rejected: unsuitable for CI and typecheck enforcement.

## D-112 — Write mode deletes stale generated mirrors with valid provenance

**Date:** 2026-05-15
**Decision:** `definitions:write` deletes stale generated mirrors when they have
valid Firehorse provenance and their canonical source no longer exists. Check
mode reports the same condition as stale output.
**Rationale:** Deleting stale mirrors in write mode keeps provider surfaces in
sync with canonical definitions while protecting hand-authored files through the
valid-provenance guard. D-112 clarifies D-105 by assigning deletion to write mode
and stale detection to check mode.
**Alternatives considered:**

- Manual deletion — rejected: stale generated resources would linger in package
  surfaces.
- Report only — rejected for write mode because the update command should repair
  generated state when it can do so safely.

## D-113 — PROJECT.md uses long-lived product anchor sections

**Date:** 2026-05-15
**Decision:** `horse-new-project` writes `docs/PROJECT.md` as a long-lived
product anchor with sections for vision, target users, problem, value
proposition, success criteria, constraints, and open questions.
**Rationale:** `PROJECT.md` should describe durable product context, not a PRD,
lean canvas, or implementation plan. These sections preserve the business and
product language that future workflows need before writing feature-specific PRDs.
**Alternatives considered:**

- PRD-like sections — rejected: PRDs are slice-specific, while `PROJECT.md`
  should survive many PRDs.
- Lean canvas style — rejected: useful for business modeling, but less direct as
  day-to-day agent context.

## D-114 — DESIGN.md is only created when design language is defined

**Date:** 2026-05-15
**Decision:** If the user defers Impeccable or brand definition,
`horse-new-project` does not create `docs/DESIGN.md`; it tells the user how to
create it later.
**Rationale:** A design anchor should contain real design language. Empty or
"not defined yet" placeholders are low-signal and can mislead future agents.
**Alternatives considered:**

- Create a stub DESIGN.md — rejected: creates a durable file with no durable
  knowledge.
- Ask a few basic brand questions and create a lightweight version — rejected:
  weaker than using Impeccable when the user is ready.

## D-115 — Map-codebase writes split codebase anchors

**Date:** 2026-05-15
**Decision:** `horse-map-codebase` writes the split codebase anchors exactly:
`ARCHITECTURE.md`, `STRUCTURE.md`, `CONVENTIONS.md`, `TESTING.md`,
`INTEGRATIONS.md`, and `CONCERNS.md` under `docs/codebase/`.
**Rationale:** Split anchors let future agents read only the relevant codebase
context instead of loading one large map.
**Alternatives considered:**

- One combined `docs/codebase/MAP.md` — rejected: less selective and harder to
  keep focused.
- Both combined and split docs — rejected: duplicate content and freshness
  burden.

## D-116 — New-project maps the codebase after starter setup

**Date:** 2026-05-15
**Decision:** After starter setup creates or overlays code,
`horse-new-project` runs `horse-map-codebase` so `docs/codebase/` reflects the
resulting codebase.
**Rationale:** Codebase anchors should be created as soon as real code exists so
future planning and issue-generation workflows have accurate technical context.
**Alternatives considered:**

- Map only brownfield existing code — rejected: starter setup also creates a
  real codebase worth documenting.
- Ask every time — rejected: codebase mapping should be the default once code
  exists.

## D-117 — New-project writes local PRD and issue drafts before GitHub mutation

**Date:** 2026-05-15
**Decision:** Before creating GitHub issues, `horse-new-project` writes local
review/handoff drafts: `docs/prds/prd-{autoinc}-{slug}.md` and
`docs/issues/issue-{autoinc}-{slug}.md`.
**Rationale:** Local drafts let the user review, pause, hand off, or continue if
GitHub is not configured. They also provide a durable source for issue creation
that follows the bundled `to-prd` and `to-issues` patterns.
**Alternatives considered:**

- GitHub issues as the only artifact — rejected: blocks handoff and continuation
  when GitHub auth or approval is unavailable.
- Only issue drafts — rejected: loses the PRD-level product context that issue
  slices derive from.

## D-118 — New-project uses embedded non-technical setup explanations

**Date:** 2026-05-15
**Decision:** `horse-new-project` includes fixed, non-technical explanations for
starter apps, hosting, database/auth, and environment variables.
**Rationale:** The workflow should be approachable for non-technical product
setup decisions and should explain technical choices consistently instead of
improvising or sending users to external docs first.
**Alternatives considered:**

- Let the agent improvise explanations — rejected: inconsistent and can become
  too technical.
- Link to external docs only — rejected: interrupts the guided setup flow.

## D-119 — New-project references to-prd and to-issues behavior instead of copying templates

**Date:** 2026-05-15
**Decision:** `horse-new-project` should reference and use the bundled `to-prd`
and `to-issues` behavior rather than copying their full templates or inventing a
separate Firehorse-native issue format.
**Rationale:** Those skills already encode the desired PRD and tracer-bullet
issue practices. Referencing them keeps Firehorse aligned with bundled upstream
behavior and avoids template drift.
**Alternatives considered:**

- Copy the templates into `horse-new-project` — rejected: creates duplicated
  templates that can drift from the bundled skills.
- Invent a Firehorse-native issue format — rejected: unnecessary divergence from
  already bundled planning skills.

## D-120 — New-project proposes a full default label vocabulary

**Date:** 2026-05-15
**Decision:** `horse-new-project` proposes the default labels `needs-triage`,
`needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`, `setup`,
`product`, `design`, `frontend`, `backend`, `infra`, `docs`, and `blocked`, then
creates only approved missing labels.
**Rationale:** The default set aligns with Matt Pocock's triage expectations and
adds practical routing labels for setup and product work. Approval prevents
surprising repository metadata changes.
**Alternatives considered:**

- Minimal labels only — rejected: too little routing context for generated work.
- Ask from scratch — rejected: makes setup harder for users who want sensible
  defaults.

## D-121 — New-project proposes `MVP` as the default milestone

**Date:** 2026-05-15
**Decision:** `horse-new-project` proposes `MVP` as the default milestone and
creates it only after approval.
**Rationale:** `MVP` is understandable to product and non-technical users and
fits the project-bootstrap phase better than a version number.
**Alternatives considered:**

- `v0` — rejected: more implementation/release flavored than product flavored.
- Ask every time without a default — rejected: unnecessary friction.

## D-122 — PRD and issue draft filenames use zero-padded four-digit numbering

**Date:** 2026-05-15
**Decision:** Local PRD and issue drafts use per-folder zero-padded four-digit
numbers, such as `docs/prds/prd-0001-{slug}.md` and
`docs/issues/issue-0001-{slug}.md`.
**Rationale:** Zero padding keeps file ordering stable and readable as the draft
sets grow.
**Alternatives considered:**

- Plain integers — rejected: sort poorly once counts reach double digits.
- Date-based names — rejected: multiple drafts in one day still need ordering.

## D-123 — Starter overlay uses temp checkout and conflict report

**Date:** 2026-05-15
**Decision:** Existing-repo starter overlay clones or copies the starter into a
temporary location, copies non-conflicting files by default, writes a conflict
report, and asks before replacing any conflicting existing file.
**Rationale:** This preserves user work while making conflicts reviewable in one
place instead of interrupting the user for every file.
**Alternatives considered:**

- Git merge from template — rejected: template history/provenance and unrelated
  repo histories can make the flow confusing.
- Backup and overwrite — rejected: still destructive.

## D-124 — Product discovery asks one question at a time

**Date:** 2026-05-15
**Decision:** `horse-new-project` product discovery asks one question at a time
and provides a recommended answer for each question.
**Rationale:** Product language benefits from iterative sharpening. One-at-a-time
questions let the agent challenge fuzzy terms, update docs incrementally, and
avoid overwhelming non-technical users.
**Alternatives considered:**

- Batch product questions — rejected: faster but less precise for product
  discovery.
- Let the agent choose cadence — rejected: inconsistent user experience.

## D-125 — New-project runs setup-matt-pocock-skills before issue drafting

**Date:** 2026-05-15
**Decision:** Before drafting or creating issues, `horse-new-project` runs or
uses the bundled `setup-matt-pocock-skills` behavior to record issue tracker,
triage label, and domain-doc expectations.
**Rationale:** `to-prd` and `to-issues` expect issue tracker and triage context.
Running the setup behavior keeps generated PRDs/issues aligned with the bundled
Matt Pocock engineering skills instead of inventing parallel conventions.
**Alternatives considered:**

- Tell the user to run setup separately — rejected: too easy to miss during a
  bootstrap workflow.
- Infer everything ad hoc — rejected: weaker than the explicit setup contract the
  bundled skills already provide.

## D-126 — Published local drafts are retained with tracker links

**Date:** 2026-05-15
**Decision:** After successful GitHub publishing, local PRD and issue drafts are
kept and updated with the created GitHub issue links.
**Rationale:** Drafts remain useful for handoff, review, and continuity. Keeping
tracker links ties local context to external work items without forcing future
agents to rediscover the mapping.
**Alternatives considered:**

- Delete drafts after publish — rejected: loses reviewable local context.
- Ask every time — rejected: unnecessary friction for a safe default.

## D-127 — New-project stays out of Phase 2 examples

**Date:** 2026-05-15
**Decision:** Phase 2 Definition Format examples remain focused on
`diagnose-fix`; `new-project` is implemented later under REQ-09 after the
Definition Format and projection generator exist.
**Rationale:** `new-project` is large and product/process-heavy. Keeping it out
of the initial Definition Format examples lets Phase 2 prove the schema and
projection path with the smaller `diagnose-fix` fixture first.
**Alternatives considered:**

- Make `new-project` the second Phase 2 example — rejected: too much scope for
  the first schema/projection slice.
- Replace `diagnose-fix` with `new-project` — rejected: loses the concrete bug-
  workflow fixture already chosen.

## D-128 — PROJECT.md is evergreen context referenced by PRDs

**Date:** 2026-05-15
**Decision:** `docs/PROJECT.md` is the periodically updated high-level product
picture. PRDs reference it and should not duplicate the entire project context.
**Rationale:** A project can have many PRDs over time. Keeping the big picture in
one evergreen anchor reduces duplication and keeps PRDs focused on specific
slices or features.
**Alternatives considered:**

- Copy full project context into every PRD — rejected: duplicates stale context.
- No formal relationship — rejected: future agents need a predictable link
  between project-level context and feature-level PRDs.

## D-129 — Codebase maps include freshness metadata

**Date:** 2026-05-15
**Decision:** Each `docs/codebase/*` map includes freshness metadata, including
source commit/hash and timestamp.
**Rationale:** Codebase maps can go stale as code changes. Explicit freshness
metadata helps future agents decide whether to trust, refresh, or qualify the
map before using it.
**Alternatives considered:**

- Prose-only maps — rejected: no way to judge staleness.
- Separate freshness file only — rejected: easier to miss when reading an
  individual anchor.

## D-130 — shadcn/ui ships as a required upstream skill

**Date:** 2026-05-15
**Decision:** Firehorse vendors the official `shadcn/ui` agent skill from
`shadcn-ui/ui/skills/shadcn`, pins it in core, and mirrors it into both Pi and
Claude distributions. Its earlier Pi `worker` default clause is superseded by
D-132.
**Rationale:** shadcn/ui work is CLI- and project-context-sensitive. Reliable UI
component additions require the upstream skill's rules for `components.json`,
component docs, registries, icons, base-vs-radix APIs, Tailwind versions, and
preset handling.
**Alternatives considered:**

- Rely on generic frontend guidance — rejected: misses shadcn-specific CLI and
  composition rules.
- Make users install the skill separately — rejected: breaks Firehorse's
  one-install reliable-agent surface.

## D-131 — New-project derives and applies a shadcn preset from DESIGN.md

**Date:** 2026-05-15
**Decision:** When `new-project` defines `docs/DESIGN.md` and the selected stack
uses shadcn/ui, it should derive a shadcn preset from that design direction and
use the shadcn CLI to initialize or apply it before component implementation.
**Rationale:** A design anchor should become executable design-system setup, not
just prose. Applying a preset before adding components keeps generated UI aligned
with the documented brand, typography, colors, radius, and style choices.
**Alternatives considered:**

- Only write `docs/DESIGN.md` — rejected: later component work would still start
  from generic shadcn defaults.
- Hand-edit theme files first — rejected: the shadcn skill and CLI provide the
  safer provider-supported preset path.

## D-132 — Pi subagent defaults use Pi-native memory tools

**Date:** 2026-05-15
**Decision:** Firehorse's Pi `firehorse.subagents.json` default overrides grant
code-oriented Pi subagents the Pi-native `memory_recall` tool from
`pi-agent-memory`, not Claude-only direct MCP tool names from `claude-mem`.
The bundled `shadcn` skill remains exposed for shadcn/ui tasks but is not granted
to the Pi `worker` subagent by default yet.
**Rationale:** `pi-agent-memory` is the Pi adapter and registers `memory_recall`;
`claude-mem` owns Claude-side MCP tools such as search/timeline/smart-search.
Using Claude tool names in Pi subagent allowlists creates missing tools and
confuses adapter boundaries.
**Alternatives considered:**

- Keep `plugin_claude_mem_mcp_search_*` in Pi subagent allowlists — rejected:
  those are Claude/MCP adapter tool names, not Pi-native `pi-agent-memory`
  tools.
- Grant `shadcn` to every worker by default — rejected for now: the skill should
  be used for shadcn/ui-specific work, not every implementation handoff.

## D-133 — Firehorse-pi bundles and starts claude-mem for Pi-only memory

**Date:** 2026-05-15
**Decision:** Firehorse-pi bundles the upstream `claude-mem` npm package and
ships a Pi session-start extension that checks and starts the bundled
claude-mem worker for Pi-only harness use. `pi-agent-memory` remains the Pi
adapter and uses the Pi-native `memory_recall` tool; it connects to that worker
rather than requiring Claude Code to be installed.
**Rationale:** `pi-agent-memory` depends on the claude-mem worker API for the
SQLite/FTS5/Chroma database, context injection, and memory search. Firehorse's
one-install Pi distribution should make memory work for users who only use
pi.dev, not just users who also installed Claude Code.
**Alternatives considered:**

- Require Pi users to install Claude Code or the Claude plugin first — rejected:
  violates Firehorse's cross-provider and Pi-only support goals.
- Tell Pi users to run upstream `npx claude-mem install` manually as the normal
  path — rejected: acceptable as fallback/repair, but not as the default
  Firehorse-pi experience.
- Reimplement/fork the claude-mem worker in Firehorse — rejected: upstream owns
  the memory runtime; Firehorse should bundle and start it, not fork it.

## D-134 — Definition Format v1 frontmatter fields are closed

**Date:** 2026-05-15
**Decision:** Schema version 1 frontmatter is fixed in
`docs/FIREHORSE-DEFINITION-FORMAT.md`. All definition kinds share
`schemaVersion`, `id`, `kind`, `title`, `description`, optional `aliases`,
optional `deprecated`, optional `replacedBy`, and provider-neutral optional
`requires` / `optional` capability sets. Workflow definitions additionally allow
`arguments`, `skills`, `agentRoles`, and structured `upstreamSkills` references.
Firehorse-authored skill definitions use only the common fields. Agent-role
definitions additionally allow the documented `pi-subagents` agent field basis:
`name`, `package`, `tools`, `model`, `fallbackModels`, `thinking`,
`systemPromptMode`, `inheritProjectContext`, `inheritSkills`, `defaultContext`,
`skills`, `extensions`, `output`, `defaultReads`, `defaultProgress`,
`interactive`, and `maxSubagentDepth`. Unknown top-level frontmatter fields fail
validation for schema version 1.
**Rationale:** Issue #3 needed the remaining human-reviewable schema question
closed before implementation. A closed field set lets the parser, validator, and
projection generator be built against a stable contract while preserving the
already-decided boundary that definitions are declarative authoring files, not a
runtime or execution graph.
**Alternatives considered:**

- Leave frontmatter details to the parser implementation — rejected: would make
  issue #4 reopen schema design instead of implementing it.
- Give skills workflow-like reference fields in v1 — rejected: workflows own
  composition references for the initial contract, while skills remain reusable
  instruction ingredients.
- Split agent-role fields into portable and Pi-specific blocks — rejected per
  D-36; adapters should filter unsupported fields rather than splitting the role
  contract.

## D-135 — Definition Format v1 accepted for implementation

**Date:** 2026-05-15
**Decision:** The user accepted the schema version 1 Definition Format contract
implemented in `packages/firehorse-core/definitions/` and documented in
`docs/FIREHORSE-DEFINITION-FORMAT.md`. D-135 supersedes D-134 where the earlier
human-review contract used pre-implementation field names. The accepted v1
workflow frontmatter uses `argumentHint`, `supportingSkills`, `agentRoles`, and
structured `upstreamSkills`; Firehorse-authored skills use the common fields plus
Agent Skills metadata (`license`, `compatibility`); agent roles use Firehorse
identity plus the documented `pi-subagents` field basis. Required body sections
are the parser-enforced headings in `requiredSectionsByKind`.
**Rationale:** Issue #3's human-review gate is now resolved, so parser,
validator, projection, manifest, and documentation work can proceed without
reopening v1 field design. The accepted contract matches the generated Pi/Claude
mirrors and the TDD coverage that asserts the docs include complete canonical
examples.
**Alternatives considered:**

- Keep D-134's pre-implementation `arguments` / `skills` workflow fields —
  rejected: the implementation and projections use `argumentHint` for native UX
  and structured `supportingSkills` references for Firehorse-authored skills.
- Defer acceptance until after runtime design — rejected: Phase 2 explicitly
  defines static authoring and projection, not runtime execution.

## D-136 — Retire repo-local `.planning/` in favor of docs anchors and GitHub tracking

**Date:** 2026-05-15
**Decision:** This repository no longer keeps roadmap, requirements, active
state, project anchor, or binding decisions under `.planning/`. Durable project
knowledge lives in `docs/PROJECT.md`, binding project-wide decisions live in
`docs/DECISIONS.md`, PRD-specific Planning Workspaces live under `docs/prds/`,
and roadmap/requirements/state tracking lives in GitHub Issues/Projects for
`cinjoff/firehorse`. Context-gathering produced for a specific PRD is folded
into that PRD's Planning Workspace instead of remaining in a root
`context-gather/` directory. This supersedes D-09 for the location of this repo's
planning documents while preserving D-09's constraint that Firehorse does not
adopt GSD machinery.
**Rationale:** The project now uses GitHub for tracking, so keeping parallel
local roadmap/state/requirements files creates drift. Moving long-lived anchors
and decisions into `docs/` aligns this repo with the Firehorse `new-project`
direction that avoids `.planning/` and writes durable project knowledge under
`docs/`.
**Alternatives considered:**

- Keep `.planning/` as a local mirror of GitHub tracking — rejected: duplicates
  the tracker and invites stale state.
- Fold the entire decision log into `CONTEXT.md` — rejected: `CONTEXT.md` is the
  glossary and resolved vocabulary map, while decisions need append-only
  rationale and alternatives.
- Split every historical decision into individual ADR files now — rejected:
  valuable but too noisy for this cleanup; `docs/DECISIONS.md` remains the
  durable decision log and can later be split deliberately.
- Delete PRD-specific context-gathering notes after summarizing them — rejected:
  preserving them inside the relevant Planning Workspace keeps the evidence
  available without leaving one-off root directories.

## D-137 — Codebase health uses a workflow plus scoped session-start hooks

**Date:** 2026-05-15
**Decision:** Firehorse will model continuous codebase improvement as a
canonical `assess-codebase-health` workflow plus explicit provider-specific
session-start hooks. The workflow is separate from `map-codebase`; it consumes or
refreshes Codebase Maps when possible, gathers code intelligence evidence,
architecture-review guidance, and confirmed memory observations, writes the
current `docs/codebase/health.md` Codebase Health Report, and creates local Issue
Drafts for Critical or High-leverage improvements before asking whether to
publish them as GitHub issues. Watchlist findings appear in the report and
startup summaries but do not automatically create Issue Drafts.

The current Codebase Health Report is a semi-structured Markdown Project Anchor
with YAML freshness metadata, stable finding IDs/fingerprints, severity
(`Critical`, `High-leverage`, `Watchlist`), lifecycle status (`open`, `drafted`,
`published`, `accepted-debt`, `ignored`, `decision-revisit`, `resolved`), links
to local Issue Drafts and GitHub ticket URLs, and no single numeric health score.
Resolved findings are removed from the current report once tracker status or
verification evidence confirms closure. Accepted-debt findings require a reason
and stop startup nagging until assumptions change, touched files change
substantially, related work touches the area, or the user explicitly asks for
reassessment.

The optional project-local Codebase Health Policy lives at
`docs/codebase/health-policy.json`. When absent, the default policy treats the
report as stale after 24 hours or after meaningful codebase changes. Freshness
policy remains project/provider-aware and configurable instead of hard-coding
repository-specific rules into the canonical workflow.

The Pi projection can require Pi-native code intelligence capabilities such as
`pi-lens` when expected in the target environment and may rely on the bundled
Matt Pocock `improve-codebase-architecture` skill. Claude projections should use
Claude-native memory, code tools, skills, and agents rather than Pi-specific
implementation details. Memory unavailability is missing evidence, not a hard
failure; memory-derived findings must be confirmed against current code before
becoming candidate work and should cite observation IDs/titles and summarized
claims rather than dumping raw memory.

Provider-specific health hooks are enabled by default but are lightweight,
bounded, and distribution-owned; they are not a generalized Firehorse runtime or
autonomous execution engine. They run only inside recognizable project
repositories with a writable `docs/` area or equivalent Project Anchor location.
They run on startup/new/resume-style session starts, skip reload, normally skip
forks unless the report is missing or stale and the fork is long-lived, read
metadata, compare lightweight local freshness signals, summarize existing
findings, and suggest `horse-assess-codebase-health` without auto-running deep
analysis. They may run bounded local commands such as `git rev-parse HEAD` and
`git diff --name-only`, but they do not perform network calls or hit GitHub by
default. They throttle repeated notifications for the same stale state or finding
fingerprint, and support environment controls such as
`FIREHORSE_SKIP_CODEBASE_HEALTH_CHECK`,
`FIREHORSE_CODEBASE_HEALTH_CHECK_TIMEOUT_MS`, and
`FIREHORSE_CODEBASE_HEALTH_STALE_HOURS`. Pi implements this as hand-authored
extension code under `packages/firehorse-pi/extensions/`; Claude implements it
as hand-authored hook code under `packages/firehorse-claude/hooks/`. These hooks
are not Generated Mirrors.

When `assess-codebase-health` creates local cleanup Issue Drafts, it creates one
Planning Workspace per health run and groups all generated drafts for that run.
Publication UX offers publishing all drafts, choosing a subset, or deferring all
publication. Architecture-oriented drafts respect the bundled Matt Pocock
`improve-codebase-architecture` interaction model: they frame exploratory
deepening opportunities with evidence and candidate seams, but do not prescribe
final interfaces unless the user has already approved that design direction.

Full implementation acceptance includes a valid canonical workflow definition,
generated Pi and Claude mirrors and manifests exposing
`horse-assess-codebase-health`, a typechecked Pi extension, Claude hook parsing
and freshness tests or fixtures, and passing `definitions:check`.

**Rationale:** The goal is continuous improvement with minimal user friction: a
fresh, durable codebase-health view should inform planning, building, reviewing,
and bug fixing, while startup behavior stays cheap and non-invasive. Splitting
the canonical workflow from provider-owned hooks preserves Firehorse's static
Definition Format and projection model while still delivering the requested
installed experience. Stable finding IDs, lifecycle status, tracker links, and
local Issue Drafts prevent duplicate nagging and make findings actionable without
publishing tracker mutations automatically.

**Alternatives considered:**

- Make the session-start hook the workflow — rejected: it would blur durable
  workflow behavior with provider-specific startup plumbing and risk an implicit
  runtime loop.
- Run deep codebase mapping and architecture review on every session start —
  rejected: too expensive and intrusive; startup should only check freshness and
  surface existing findings.
- Store only ephemeral notifications or memory observations — rejected: future
  workflows need a durable Project Anchor with freshness metadata.
- Auto-publish every finding as a GitHub issue — rejected: local Issue Drafts are
  created first, and publication requires user confirmation with options to
  publish all, choose a subset, or defer.
- Keep every historical health run locally — rejected for the initial model:
  the current report plus git/GitHub history are enough and avoid local growth.
- Use a numeric health score — rejected: it invites vanity metrics; severity,
  lifecycle status, freshness, and top findings are more actionable.

## D-138 — Firehorse allows a narrow setup runtime and setup manifest

**Date:** 2026-05-15
**Decision:** Firehorse may include narrow setup and session-start runtime code,
but not a generalized workflow execution engine. The setup runtime validates a
checked-in, non-secret `.firehorse/manifest.json` Firehorse Setup Manifest on
session start, detects missing project setup such as GitHub repository metadata,
Tracker Project expectations, labels, and provider setup, and suggests fixes by
default. Mutations happen through explicit `new-project`, `firehorse-setup`, or a
user-approved apply step. Session-start validation is read-only by default. The
initial manifest shape records `schemaVersion`, project name, GitHub owner/repo
and Tracker Project name, `setup.autoApplySafeFixes`, required label vocabulary,
and expected Tracker Statuses. The `build` workflow may manually move a scoped
Published Issue to In Progress using the `gh` CLI after scope confirmation.

Shared manifest schema, validation rules, and setup requirement modeling belong
in `firehorse-core`; provider/session-start integration belongs in
`firehorse-pi` and `firehorse-claude`. This decision preserves the existing
boundary that Firehorse definitions and generated mirrors are not runtime-loaded
workflow graphs.

**Rationale:** The project needs an installed experience that can notice when a
repository is missing required Firehorse setup as new workflows add expectations,
without forcing users to remember manual checks. A manifest gives Firehorse a
stable, reviewable source of project setup truth. Keeping session-start behavior
read-only by default avoids surprising repository or GitHub mutations, while
explicit setup commands can still apply approved fixes.

**Alternatives considered:**

- Keep all setup as static prompt instructions — rejected: Firehorse could not
  reliably detect drift as setup requirements evolve.
- Allow a full workflow runtime or background agent engine — rejected: that would
  violate the Definition Format's static authoring/projection boundary and blur
  setup checks with workflow execution.
- Store setup expectations in a generic root `manifest.json` — rejected: too
  likely to collide with application/package manifests; `.firehorse/manifest.json`
  is explicit and leaves room for future Firehorse-local files.
- Auto-apply safe fixes on every session start — rejected as the default because
  even small GitHub mutations can be surprising; projects can opt into explicit
  auto-apply behavior later.

## D-139 — Firehorse owns exposed agent roles and reviewer subsumes code-reviewer

**Date:** 2026-05-15
**Decision:** Firehorse will move every agent it exposes, configures, overrides,
or relies on into canonical `agent-role` definitions under
`packages/firehorse-core/definitions/agent-roles/`. Generic roles include
`worker`, `planner`, `reviewer`, `researcher`, `scout`, `oracle`,
`context-builder`, and `delegate`, with generated provider-native names such as
`horse-worker` and `horse-reviewer`. Existing upstream/provider-specific agent
files become generated mirrors, compatibility artifacts, or references rather
than the source of truth.

The canonical `reviewer` role subsumes the previously separate `code-reviewer`
role. Code, PR, issue-sized-change, release, plan, and workstream review are
focuses or modes of `reviewer` unless a future role needs genuinely different
authority or responsibilities. `build` should use `worker` for bounded
implementation cycles and `reviewer` for review gates. `ship` should use
`reviewer` for PR/release review gates and should not depend on `worker` by
default.

**Rationale:** Firehorse already configures and relies on generic provider
agents, but hidden provider-native prompts make their behavior hard to review and
control. Canonical definitions keep implementation instructions visible,
testable, projected from one source, and aligned across Pi and Claude. Merging
`code-reviewer` into `reviewer` avoids parallel review roles with overlapping
missions and reduces drift.

**Alternatives considered:**

- Keep generic agents as upstream/provider-owned files plus Firehorse overrides —
  rejected: this preserves poor visibility and makes behavioral drift likely.
- Canonicalize only `worker` first — rejected: the same source-of-truth problem
  applies to every exposed/configured generic agent.
- Keep `code-reviewer` separate from `reviewer` — rejected: the distinction is a
  review focus, not a separate role boundary for the current Firehorse model.

## D-140 — Do not preserve a code-reviewer compatibility alias

**Date:** 2026-05-15
**Decision:** When the canonical `reviewer` Agent Role subsumes `code-reviewer`,
Firehorse will not preserve a compatibility alias or generated `horse-code-reviewer`
surface. The migration should remove the old role and update workflows,
projections, manifests, and documentation to reference `reviewer` instead.
`review-code` remains the workflow ID; only the supporting Agent Role changes.
`plan-reviewer` remains separate for now because plan review includes product,
requirements, and execution semantics beyond generic review.

**Rationale:** Keeping both `reviewer` and `code-reviewer` visible would preserve
the same role drift the canonical-agent migration is meant to eliminate. The
public workflow name `review-code` already communicates the user-facing task,
while the implementation role can be unified under `reviewer` focuses.

**Alternatives considered:**

- Preserve `horse-code-reviewer` as a deprecated alias for one release — rejected:
  the user explicitly preferred no compatibility alias.
- Rename `review-code` as well — rejected: workflow IDs describe user-facing
  tasks and can remain stable while supporting roles change.
- Merge `plan-reviewer` into `reviewer` immediately — rejected for now because
  plan review has distinct product and requirements authority.

## D-141 — Generic agent-role projections use provider-native names

**Date:** 2026-05-17
**Decision:** Generic Firehorse-owned Agent Roles are exposed under provider-native
agent names without the `horse-` prefix, such as `worker`, `reviewer`, `planner`,
`researcher`, `scout`, `oracle`, `context-builder`, and `delegate`. This
supersedes D-139 only where D-139 described generated provider-native names such
as `horse-worker` and `horse-reviewer`. Workflow and skill Generated Mirrors keep
using `horse-<id>` names; generic agent projections intentionally overwrite the
existing non-`horse-*` provider agent files with minimal behavior changes first,
then evolve under canonical Firehorse definitions.

Upstream `pi-subagents` agent wording and behavior should seed the first
canonical generic Agent Roles where useful, but Firehorse-authored definitions are
the source of truth after migration. The migration should be sliced: first
`reviewer` replaces `code-reviewer`, then `worker` and build references, then the
remaining generic roles, then `ship`, then `new-project` setup runtime work.
`plan-reviewer` remains a distinct Agent Role because plan review is a different
agent responsibility.

**Rationale:** Users already interact with provider-native generic agents by
plain names, and replacing those files directly gives Firehorse control and
visibility without creating duplicate `horse-*` generic agents beside the old
ones. Preserving upstream wording initially avoids reinventing already useful
agent behavior while still moving ownership to Firehorse.

**Alternatives considered:**

- Expose generic agents as `horse-worker`, `horse-reviewer`, and similar names —
  rejected: this would duplicate existing generic agents rather than taking
  control of the provider-native surfaces users already use.
- Rewrite generic agents from scratch during migration — rejected: preserve what
  works first, then improve deliberately over time.
- Keep existing non-`horse-*` agents as separate compatibility files — rejected:
  the goal is to overwrite them from canonical projections and prevent drift.

## D-142 — All Agent Role projections use plain names with minimal provenance

**Date:** 2026-05-18
**Decision:** All Firehorse-owned Agent Role projections use plain provider-native
agent names without the `horse-` prefix, including specialist roles such as
`plan-reviewer` as well as generic roles such as `worker` and `reviewer`. This
supersedes D-141 where it scoped the plain-name convention to generic Agent
Roles only. Workflow and skill Generated Mirrors continue to use `horse-<id>`
names. Agent Role projections may overwrite provider-native agent files and must
carry only minimal, non-intrusive provenance so generated metadata does not
materially affect the agent's working instructions.

`definitions:write` may overwrite provider-native agent files for Agent Role
projections once the target is intentionally Firehorse-managed. The first
migration of a non-provenanced provider-native agent file should be explicit and
reviewable; after migration, normal generated-file safety applies.

**Rationale:** Agent files are executable instruction surfaces, so bulky
provenance blocks can degrade or distract the agent behavior they are meant to
control. Plain provider-native names let Firehorse take ownership of the actual
agent surfaces users and workflows already call, without creating duplicate
`horse-*` agents beside them.

**Alternatives considered:**

- Keep plain names only for generic roles — rejected: specialist Agent Roles are
  still provider-native agents and should follow the same naming rule.
- Use full generated-mirror provenance headers in Agent Role files — rejected:
  auditability is required, but provenance must not intrude on the role prompt.
- Keep first migration purely implicit in `definitions:write` — rejected: the
  first overwrite of a non-provenanced provider-native agent should be explicit
  so users can review the ownership change.

## D-143 — Canonical Agent Role sources generate top-level provider agents

**Date:** 2026-05-18
**Decision:** Canonical Firehorse-owned Agent Role source files should live under
`packages/firehorse-core/agents/` and generate directly to top-level
provider-native agent paths such as `packages/firehorse-claude/agents/worker.md`
and package-local Pi sync sources for `worker.md`, `reviewer.md`, and
`plan-reviewer.md`. Agent Role projections should not live under provider
`agents/firehorse/` paths, and stale generated agent files under those paths
should be deleted when provenance confirms they are old mirrors. Package manifests
and setup metadata should expose the top-level provider-native agent files.

Agent Role projections use compact frontmatter provenance only, or the smallest
additional marker required for generator safety. Generated agent instructions
should start quickly and avoid large provenance banners. `definitions:write` may
overwrite provider-native agent targets because canonical Agent Role sources lead;
user edits to generated agent targets are not preserved as source of truth. This
supersedes D-142 where it required explicit first-migration protection for
non-provenanced provider-native agent files.

**Rationale:** Firehorse wants one visible canonical source for agents it owns,
while provider users should interact with the normal agent names and paths. A
separate `agents/firehorse/` namespace would create shadow agents rather than
actually taking over the configured provider-native surfaces. Agent prompts are
execution instructions, so provenance must be compact enough not to distract the
agent.

**Alternatives considered:**

- Keep Agent Role canonical sources under `definitions/agent-roles/` — rejected:
  the user wants canonical agents grouped under `firehorse-core/agents/`.
- Generate Agent Roles under provider `agents/firehorse/` paths — rejected:
  canonical agents should occupy the actual top-level provider-native agent
  surfaces.
- Protect user edits in generated provider-native agent files — rejected:
  canonical definitions lead, and generated targets are not the editable source.

## D-144 — Agent Role sources live under `definitions/agents/`

**Date:** 2026-05-18
**Decision:** Canonical Firehorse-owned Agent Role source files live under
`packages/firehorse-core/definitions/agents/`, not under
`packages/firehorse-core/agents/`. This supersedes D-143 only for canonical
source location. Agent sources still use Definition Format v1 with
`kind: agent-role`, still generate directly to top-level provider-native agent
paths, still use plain provider-native names without a `horse-` prefix, and stale
provenanced provider `agents/firehorse/` mirrors should still be removed by write
mode and rejected by check mode.

**Rationale:** Keeping agents under `definitions/agents/` preserves a consistent
source-tree shape with `definitions/workflows/` and `definitions/skills/` while
still making agents first-class and visible. The directory name `agents` matches
provider/user terminology, while the schema `kind: agent-role` preserves the
canonical Firehorse domain term.

**Alternatives considered:**

- Use `packages/firehorse-core/agents/` — rejected after review because it splits
  canonical definitions across multiple roots.
- Keep `packages/firehorse-core/definitions/agent-roles/` — rejected because the
  requested directory should be `agents` for consistency with workflow/skill
  provider language.
- Rename the schema kind from `agent-role` to `agent` — rejected for now because
  the user accepted the same Definition Format shape and existing canonical term.

## D-145 — Build-to-Ship and canonical agents ship as one PRD with sliced issues

**Date:** 2026-05-18
**Decision:** The TDD-integrated build, canonical worker/reviewer agent migration,
`ship` workflow, and `new-project` setup runtime work should be planned as one
PRD with independently grabbable vertical-slice issues. The first implementation
slice is moving Agent Role sources to `packages/firehorse-core/definitions/agents/`
and projecting them to top-level provider-native agent files while deleting stale
provenanced provider `agents/firehorse/` mirrors. Canonical `worker` should land
before `build` changes so `build` can reference it for bounded implementation
cycles. `ship` should wait until the agent projection layout, canonical `worker`,
and `build` evidence/status updates are in place. The setup manifest/runtime and
`new-project` workflow can proceed after manifest schema/check design, but should
be sliced separately from `ship`.

**Rationale:** This work crosses definitions, projections, provider manifests,
workflow instructions, GitHub Projects setup, and release automation. Treating it
as one PRD preserves the end-to-end intent while slicing implementation reduces
projection/manifests risk and gives each change a clear verification contract.

**Alternatives considered:**

- Implement `ship` first — rejected because it depends on the build/review
  evidence model and canonical reviewer/worker surfaces.
- Update `build` before canonical `worker` exists — rejected because `build`
  should reference the canonical implementation Agent Role rather than a
  provider-native prompt that is still being migrated.
- Split setup runtime into an unrelated project — rejected because manifest and
  GitHub setup are part of the same build-to-ship lifecycle, though they should
  remain separate implementation slices.

## D-146 — PRD workspaces own their issue drafts and gathered context

**Date:** 2026-05-21
**Decision:** PRD-sized planning artifacts are organized as numbered Planning
Workspace directories under `docs/prds/prd-000N-<slug>/`. Each workspace keeps
its primary PRD at `PRD.md`, gathered evidence under `context/`, PRD-scoped
Planning Decisions in `DECISIONS.md` when needed, and local Issue Drafts under
that workspace's `issues/` directory. The old flat `docs/issues/` location is
retired for this repository. This supersedes D-117 and D-122 only for the local
file layout examples; local drafts are still written before GitHub mutation, are
still zero-padded, and still retain Published Issue links after publication.

**Rationale:** Co-locating Issue Drafts and context with their parent PRD makes
ownership obvious, prevents orphaned local drafts, and keeps transient planning
evidence out of durable codebase-documentation folders. GitHub Issues/Projects
remain the canonical tracker for roadmap, requirements, and active state.

**Alternatives considered:**

- Keep a flat `docs/issues/` directory — rejected because it obscures which PRD
  owns each draft once multiple PRDs publish child issues.
- Move all transient planning evidence to `docs/codebase/` — rejected because
  codebase docs should describe the current codebase, not one-off planning or
  cleanup scans.
- Delete historical issue drafts after publication — rejected because retained
  local drafts are useful handoff and review artifacts when linked back to their
  Published Issues.

## D-147 — Session Audit includes deterministic helper code without becoming a runtime

**Date:** 2026-05-21
**Decision:** The `session-audit` Assessment Workflow should ship with a narrow
`firehorse-core` helper module under `packages/firehorse-core/src/session-audit/`,
exported as experimental `firehorse/session-audit`, for deterministic read-only
evidence discovery, metric extraction, redaction/provenance support, same-session
memory-observation attribution, bounded memory-database inspection, and candidate
signal classification. The helper should prefer SQLite capabilities already
available through installed claude-mem, context-mode, or Bun before adding any new
core SQLite dependency and must not top-level import runtime-specific SQLite
modules such as `bun:sqlite`. Memory readers should use the documented
claude-mem/pi-memory schema and observation type vocabulary, verify live schema
compatibility, and read matched observation contents before redaction rather than
metadata only. Preview phases may inspect paths, schema compatibility, row
counts, and windows, but should read observation contents only after approval.
Raw matched content may exist in process memory or sensitive typed output for
review, but generated Markdown/JSON reports persist only redacted snippets,
hashes, or withheld markers. The helper may return structured report data,
suggested Markdown, and optional JSON sidecar data, but workflow instructions or
explicit repo scripts own file writes and human-reviewed publication. The first
slice should not add a CLI. The helper must not become a prompt loader, provider
transport, autonomous execution loop, hook, telemetry system, broad private-log
scanner, unrestricted memory-database audit, raw-content persistence mechanism,
or enforcement layer.

**Rationale:** Session Audit needs repeatable measurements for session logs,
memory injections, tool usage, correction loops, verification loops, and
redaction metadata. It also needs bounded access to pi-memory/claude-mem
observations attributable to audited sessions so the audit can compare what
memory injected, fetched, and later recorded, including observation content after
redaction. Hard caps on sessions, rows, bytes, and snippets keep the helper from
silently widening into a broad private-data scanner. Keeping deterministic parts
in a provider-neutral helper reduces ad hoc agent judgement while preserving
Firehorse's rule that Workflows are instruction-first and generated provider
mirrors contain rendered guidance, not runtime references.

**Alternatives considered:**

- Keep Session Audit instruction-only — rejected because important evidence
  discovery and metric extraction can be deterministic and should be reproducible
  across runs.
- Put analyzer logic in `firehorse-pi` only — rejected because the evidence model
  and report contract are provider-neutral, even if Pi evidence support is richer
  in v1.
- Let the helper write reports directly — rejected because report writes should
  remain explicit, user-visible workflow or script actions rather than hidden
  runtime side effects.

## D-148 — Decision records are scoped before they are promoted

**Date:** 2026-05-21
**Decision:** Firehorse no longer treats root `docs/DECISIONS.md` as the default
place for every resolved planning or grilling answer. New `grill-with-docs`,
`create-plan`, and similar planning sessions should write resolved answers to the
owning Planning Workspace's `DECISIONS.md`. Root `docs/DECISIONS.md` is reserved
for project-wide decisions that apply across PRDs or change repository-wide
policy. Durable codebase-facing decisions should be promoted to `docs/codebase/`
anchors or a codebase ADR when the codebase reader needs the guidance more than
the planning reader does.

**Rationale:** The single root decision log has grown into a mixture of project
policy, PRD-local question answers, and session history. That makes it harder for
future agents to find the decision that matters for their task and encourages
loading a large file for narrow work. Local Planning Workspace decision logs keep
PRD rationale close to the PRD, while project-wide and codebase-facing promotion
keeps durable guidance discoverable from the appropriate reader entry point.

**Alternatives considered:**

- Keep appending all decisions to root `docs/DECISIONS.md` — rejected because it
  does not scale with repeated grilling sessions and hides local planning
  context from the PRD that depends on it.
- Move all old decisions immediately — rejected because the root file is
  append-only history; existing entries remain valid unless later decisions
  supersede them.
- Use only `docs/codebase/` for decisions — rejected because many planning
  decisions are requirements or sequencing choices, not durable codebase
  architecture or conventions.

## D-149 — PRD appendices should not remain as floating root docs

**Date:** 2026-05-21
**Decision:** Detailed artifacts created for a specific PRD should live in that
PRD's Planning Workspace instead of remaining as floating root-level `docs/`
files. The detailed Firehorse Definition Format v1 contract appendix now lives at
`docs/prds/prd-0001-firehorse-definition-format-and-projection/FIREHORSE-DEFINITION-FORMAT.md`,
and the historical workflow grouping map now lives at
`docs/prds/prd-0001-firehorse-definition-format-and-projection/context/WORKFLOW-MAP.md`.
Current cross-PRD guidance stays in durable anchors: `docs/ARCHITECTURE.md` for
the current architecture and definition/projection summary, `CONTEXT.md` for
vocabulary and relationships, `docs/PROJECT.md` for project scope and doc
navigation, and this file for project-wide binding decisions.

**Rationale:** Root `docs/` should not accumulate historical PRD implementation
appendices that look like current global contracts. Moving PRD-specific details
next to their owning PRD keeps historical scope visible, makes superseded fixture
names easier to identify, and avoids duplicating the same definition/projection
rules across the architecture anchor, PRD appendix, and decision log. Later PRDs
may supersede PRD-local examples or scope while the durable anchors retain the
current state.

**Alternatives considered:**

- Keep `docs/FIREHORSE-DEFINITION-FORMAT.md` and `docs/WORKFLOW-MAP.md` at root
  — rejected because they read as current global docs while much of their detail
  belongs to PRD-0001 history.
- Copy the same content into `docs/ARCHITECTURE.md` — rejected because it would
  duplicate a long contract appendix instead of keeping architecture as the
  current concise summary.
- Move the content into `docs/codebase/` — rejected because these files are PRD
  planning/contract appendices, not current codebase-map anchors.

## D-151 — Generated native resource names are the canonical Definition ID

**Date:** 2026-09-11
**Decision:** Generated provider-native resources use the canonical Definition ID
verbatim as their native name. The `horse-` prefix is removed, so
`/firehorse:horse-map` becomes `/firehorse:map`. This supersedes D-52, and
supersedes the native-invocation half of D-58 — `new-project` is now both the
canonical Workflow ID and the provider-native invocation name. The break is
clean: no compatibility aliases are projected, and the seven existing
`/firehorse:horse-*` invocations stop resolving for anyone on plugin v0.3.0.
**Rationale:** D-52 bought collision avoidance in "user-facing slash-command and
skill namespaces". That cost no longer buys anything. Claude Code namespaces
plugin commands as `/firehorse:<id>`, so the plugin name already disambiguates
and the prefix only repeats it. The prefix was also the last inconsistency in the
projection surface: skill mirrors have always projected unprefixed, and D-56/D-57
exempted agent roles, leaving commands as the only prefixed kind. Removing it
collapses `nativeName()` into identity, so the function goes with it — a second,
smaller break to the `firehorse-core` public surface, recorded in the changelog.
Because the namespace now carries disambiguation, user-facing docs must spell
commands in the `/firehorse:<id>` form; the bare `/<id>` form drops the very
thing this decision relies on.
**Alternatives considered:**

- Keep `horse-` — rejected: the collision rationale in D-52 is obsolete under
  plugin namespacing, and it leaves commands inconsistent with skills and agents.
- Project both names for one release as aliases — rejected: doubles the command
  surface users see in the picker to soften a break on a pre-1.0 plugin.
- Switch to `firehorse-` — rejected: longer, and `/firehorse:firehorse-map`
  stutters.

## D-152 — A definition declares its audience; projection branches on it

**Date:** 2026-09-11
**Decision:** Definition frontmatter takes `audience: user | maintainer`,
defaulting to `user`. `user` definitions project into the plugin
(`packages/firehorse-claude/commands/firehorse/`, `.../skills/firehorse/`) and
are listed in `plugin.json`. `maintainer` definitions project into this repo's
own `.claude/commands/` and `.claude/skills/`, are committed, and never reach
the plugin manifest. `ship` and `upstreams-check` are the first two maintainer
workflows, invoked here as `/ship` and `/upstreams-check`.
**Rationale:** `upstreams-check` cannot function outside this repo, and `ship`
encodes this repo's version sites and scripts, so neither is a capability
offered to users. Dropping them from the manifest alone would also remove them
from the maintainer's own Claude Code, because the manifest is how plugin
commands resolve. A declared audience keeps one canonical definition and one
projector while separating who is served; flipping `ship` back to `user` later
is a one-field change. The maintainer root is flat because subdirectories under
`.claude/commands/` are undocumented and the `plugin:command` colon namespace is
reserved for plugins, so `/firehorse:ship` cannot be reproduced locally.
**Alternatives considered:**

- Filter the manifest only — rejected: the maintainer loses the commands too.
- Keep the two workflows out of `definitions/` and hand-author them under
  `.claude/` — rejected: two authoring formats, and the gate stops covering them.
- A `private: true` boolean — rejected: it names the exclusion, not the reader,
  and a third audience (contributor, say) would not fit it.

## D-153 — The map's Notes block is bounded by what each line does, not by a word count

**Date:** 2026-09-11
**Decision:** `/firehorse:map` no longer caps the `## Notes` block at 200 words.
The safety gate and the counting step are replaced by a test of content: every
line is a trigger and a verb, and material that describes rather than instructs
belongs in `CONTEXT.md` or `docs/agents/`. This reverses the cap recorded on
[#51](https://github.com/cinjoff/firehorse/issues/51).
**Rationale:** The Notes block is the only carrier for standing preferences, so
truncating it truncates what every later session inherits — and it is truncated
at exactly the moment most worth writing down, charting. The cap also failed on
its own terms: charting [#97](https://github.com/cinjoff/firehorse/issues/97)
came to 187/200 words, and nineteen settled decisions went into a `## Settled in
charting` section that wayfinder's template does not define. The cap did not
make the map leaner; it pushed content somewhere less expected. Removing a hard
cap is not the same as having no bound: the block is permanent context load for
every session that opens the map, and sprawl thins attention across it, so the
constraint moves from length to whether a line would change what a session does.
**Alternatives considered:**

- Raise the cap to 400 words — rejected: the same failure at a different number,
  and it still counts the wrong thing.
- Delete the constraint outright — rejected: the block is loaded every session,
  and nothing would then stop reference material accumulating in it.
- Keep the cap and define a home for overflow — rejected: `## Settled in
  charting` is what that already produced, and wayfinder's template has no
  section for it.

