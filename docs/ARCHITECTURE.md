# Architecture

Firehorse splits two concerns that previous Claude-only frameworks tangled:

1. **What a Firehorse definition is** — its workflows, skills, agent roles, and prompts.
2. **Where and how it runs** — which LLM provider, which orchestrator.

The core lib codifies (2). The core package also owns canonical Firehorse-
authored definitions as shared source material, while distribution packages
project those definitions into each ecosystem's native shape.

## Two axes

```
                ┌──────────────────┐
                │ Workflow / Skill │   (Definition Format v1)
                │  / Agent Role    │
                └────────┬─────────┘
                         │
            ┌────────────┴────────────┐
            │                         │
       ┌────▼────┐               ┌────▼────┐
       │ Provider│               │Orchestr.│
       └────┬────┘               └────┬────┘
            │                         │
   Claude/Codex/Pi          Superset/Conductor/tmux/terminal
```

Firehorse definitions only talk to these two interfaces. They never reach for
vendor SDKs directly.

Canonical Firehorse-authored definitions live under
`packages/firehorse-core/definitions/`, organized by definition kind:
`workflows/`, `skills/`, and `agent-roles/`. Each definition is a Markdown file
with frontmatter, so schema version, identity, projection metadata, and
references stay machine-readable while the structured Markdown body carries
instruction-heavy workflow and role guidance. Every definition declares a
required integer `schemaVersion`, starting at `1`. The definition's frontmatter
ID must match its kind directory and filename path so references are explicit
and renames are intentional.
Definition IDs are globally unique across Firehorse-authored workflows, skills,
and agent roles; `kind` stays separate metadata rather than being embedded in
the ID. Definitions may declare provider-neutral `requires` and `optional`
capability requirements for tools, orchestration, modalities, or environment.
Firehorse documents common categories and values but permits extension-prefixed
values such as `mcp:github` or `provider:pi-subagents/intercom`; provider-
specific nuance belongs in projection notes. `firehorse-core` also owns the
gray-matter-parsed, Zod-backed TypeScript schema, parser, validator, and
Pi/Claude projection generator for these definition files so authoring rules and
native projections are enforced before any runtime exists. `gray-matter` and
`zod` are normal `firehorse-core` dependencies because the parser/validator are
exported core APIs. These are shared authoring source files,
validation helpers, and build-time projection helpers, not execution code.
Distribution packages receive checked-in generated mirrors with provenance in
both frontmatter and an obvious HTML comment, pointing back to the source
definition ID, path, and SHA-256 source content hash. Generated mirrors contain fully
rendered instructions so provider installs are self-contained; they include
structured references and instructions for supporting skills, agent roles, and
upstream skills rather than inlining every supporting body. Generated mirrors are
not hand-editable and must be changed by editing the canonical definition.
Generated native resource names use the `horse-<id>` prefix while canonical IDs
remain unprefixed. Generated files live under provider-native `firehorse/`
folders, such as `packages/firehorse-pi/prompts/firehorse/horse-*.md`,
`packages/firehorse-claude/commands/firehorse/horse-*.md`,
`packages/firehorse-pi/skills/firehorse/<id>/SKILL.md`,
`packages/firehorse-claude/skills/firehorse/<id>/SKILL.md`,
`packages/firehorse-pi/agents/firehorse/horse-*.md` sync artifacts, and
`packages/firehorse-claude/agents/firehorse/horse-*.md`. The repository exposes
`definitions:write` to update mirrors/manifests and `definitions:check` to fail
when generated output is stale. Write mode removes stale generated mirrors when
their provenance is valid and the canonical source no longer exists; check mode
reports the stale mirror as a failure. Definition IDs are stable public API; renames require explicit
frontmatter alias/deprecation handling. Upstream skill references use object
entries with separate `upstream` and `id` fields, validated against upstream
metadata rather than filesystem paths. Workflow definitions project to Pi prompt
templates and Claude commands as their primary user-facing invocation surfaces;
Firehorse-authored skills project to Pi/Claude skills, and Agent Roles project
to provider-native agent surfaces. Projection also updates package-local and
repo-root install manifests so generated resources are actually exposed.
Generated manifest entries are sorted deterministically by native path/name for
stable diffs.

Workflow definitions use standardized operational contract sections: purpose,
usage, inputs, outputs, supporting capabilities, orchestration intent, safety
gates, procedure, and projection notes. Generated mirrors preserve
canonical Markdown headings where possible, wrapped only with provider-specific
frontmatter and provenance. Workflow invocation metadata, such as argument hints
for generated Pi prompt templates and Claude commands, lives in workflow
frontmatter rather than being inferred from prose. The first canonical workflow
fixture is `diagnose-fix`; it accepts a freeform bug description, references the
upstream `mattpocock-skills` `diagnose` skill, uses the Firehorse-authored
`feedback-loop` skill and `diagnostic-reviewer` Agent Role, and may patch only
when the scope is clear and a regression loop exists. Firehorse-authored skills use a
reusable instruction contract: purpose, usage, inputs, outputs, instructions,
boundaries, examples, and projection notes. Agent roles use a role
contract: mission, responsibilities, inputs, outputs, tools and permissions,
decision authority, escalation rules, collaboration protocol, boundaries, and
projection notes. Imported upstream skills are exempt from Firehorse's strict
skill template: they keep their upstream-native shape and are mirrored/projected
directly as curated external ingredients. Agent-role frontmatter uses the
documented `pi-subagents` agent frontmatter
field set as its canonical basis, plus Firehorse `id` / `kind`. Distribution
adapters filter or ignore unsupported fields when projecting to non-Pi targets,
so the role definition stays complete in one place. Workflow references to
supporting content use kind-specific lists for Firehorse skills, agent roles,
and upstream skills. Provider-specific mechanisms such as Pi subagent chains,
saved chains, or intercom coordination are projection details for the matching
distribution, not canonical Firehorse definition syntax.

### Provider

`packages/firehorse-core/src/providers/provider.ts`. A provider exposes:

- `id`, `displayName`, `capabilities` (streaming, tool use, vision, parallel
  tool calls).
- `isAvailable()` — checks env vars / installed CLIs. Pure read; no network.

Add a provider by extending `BaseProvider` and registering it in
`packages/firehorse-core/src/providers/index.ts`.

### Orchestrator

`packages/firehorse-core/src/orchestrators/orchestrator.ts`. An orchestrator
exposes:

- `id`, `displayName`, `capabilities` (worktrees, parallel agents, port
  assignment, shared filesystem).
- `detect(env)` — synchronous env-var check.
- `readEnvironment(env)` — extracts `rootPath`, `workspacePath`,
  `workspaceName`, `port` when present.

Detection resolution order (`detect.ts`):

1. Superset — `SUPERSET_WORKSPACE_NAME` / `SUPERSET_ROOT_PATH`.
2. Conductor — `CONDUCTOR_WORKSPACE_NAME` / `CONDUCTOR_ROOT_PATH`.
3. tmux — `TMUX`.
4. Terminal — always matches (fallback).

First adapter whose `detect()` returns true wins.

## Upstream skills and subagents

The core package owns pinned upstream skill sources and shared subagent
definitions under `packages/firehorse-core/upstreams/`. Each upstream has an
`UPSTREAM.json` file recording its source repository or npm package, pinned
version/ref, license, selection policy, and adapter paths.

Distribution packages do not fetch upstream repositories at install time. They
mirror selected skill directories and subagent definitions from core into their
own package layouts, then expose those mirrors through native manifests. Users
update the Firehorse package/plugin version to receive upstream skill or agent
updates; runtime update checks look at Firehorse releases/packages rather than
upstream repository heads.

Upstream-originated skills keep their upstream-native source shape. Firehorse
vendors the official shadcn/ui skill this way so both Pi and Claude agents get
project-aware component, registry, and preset guidance without Firehorse
reauthoring it. Firehorse-authored workflows use the Firehorse Definition Format
defined in Phase 2 and can reference upstream skills as supporting ingredients
without making those upstream skills the source of truth for the workflow.

## Distribution packages

The core lib alone isn't directly useful to most users — they don't write
firehorse code, they install a CLI plugin or a pi extension. So firehorse
ships two distributions that adapt the core to each ecosystem's idioms.

### firehorse-pi

`packages/firehorse-pi`. A [Pi package](https://pi.dev/docs/latest/packages)
with `pi-package` keyword and a `pi` manifest in `package.json` pointing at
curated extensions, skills, and prompts. Generated workflow mirrors are exposed
as Pi prompt templates through both package-local and repo-root `pi.prompts`
entries.

Pi's dependency model lets a package selectively bundle other pi packages by
listing them in both `dependencies` and `bundledDependencies`, then referencing
their `node_modules/<pkg>/...` paths in the `pi` manifest. Firehorse-pi uses
this to re-export curated parts of upstream pi packages (`context-mode`,
`pi-lens`, `pi-mcp-adapter`, `pi-mermaid`, `pi-subagents`, `pi-web-access`, and
`pi-agent-memory` today; future packages can be added the same way) — users
install firehorse-pi **once globally** and get the Firehorse-approved surface
area. The package may
bundle more upstream files than it exposes; the `pi` manifest is an explicit
resource allow-list.

Firehorse-pi also includes `firehorse.subagents.json`, a package-owned default
override manifest for built-in `pi-subagents` roles. Because `pi-subagents`
discovers agent files from builtin/user/project agent directories rather than Pi
package manifests, generated Firehorse Agent Role mirrors are synced explicitly
by `firehorse-setup` into the user's Pi agent directory, e.g.
`~/.pi/agent/agents/horse-*.md`. A small session-start extension applies missing
defaults to user settings so code-oriented subagents can use the bundled
`pi-lens`, the Pi-native `memory_recall` tool from `pi-agent-memory`, and
context-mode processing tools where useful without each user configuring those
allowlists by hand. The bundled `shadcn` skill is exposed for shadcn/ui tasks
but is not granted to the Pi `worker` subagent by default yet. Existing user-
authored tool/skill allowlists are respected unless Firehorse previously created
them.

Memory runtime and project identity are setup-owned rather than inferred from
worktree layout. `pi-agent-memory` is the Pi adapter; it requires the upstream
`claude-mem` worker to be installed and reachable on `127.0.0.1:37777` by
default. Firehorse-pi bundles the `claude-mem` npm package and a small
session-start extension starts/checks the bundled worker scripts, so Pi-only
users do not need Claude Code installed for memory to work. Firehorse still does
not fork the worker runtime: Claude Code users normally get the same upstream
runtime through the Firehorse Claude plugin's `claude-mem` dependency, and
upstream `npx claude-mem install` remains the fallback/repair path.
`firehorse-setup` resolves the canonical GitHub repository name with
`gh repo view --json name --jq .name`, then pins the non-secret
`FIREHORSE_PROJECT_NAME`, `PI_MEM_PROJECT`, and `CLAUDE_MEM_PROJECT` values so
Superset / Conductor worktrees share the canonical repo memory namespace even
when their directories do not sit under the repository root. `--memory-project`
remains a manual fallback for non-GitHub or unavailable-`gh` environments.

Pi core packages (`@earendil-works/pi-ai`, `@earendil-works/pi-agent-core`,
`@earendil-works/pi-coding-agent`, `@earendil-works/pi-tui`, `typebox`) go in
`peerDependencies` with `"*"` per Pi's contract. Legacy upstream peer names such
as `@mariozechner/*` may also appear as optional peers when a bundled upstream Pi
package still imports them; they are not bundled.

A lightweight Pi extension checks npm's latest `firehorse-pi` version on
`session_start` and suggests `pi update npm:firehorse-pi` when the installed
package is behind. This is throttled and disabled by `FIREHORSE_SKIP_UPDATE_CHECK`,
`FIREHORSE_OFFLINE`, or `PI_OFFLINE`.

### firehorse-claude

`packages/firehorse-claude`. A [Claude Code plugin](https://docs.claude.com/en/docs/claude-code/plugins)
with `.claude-plugin/plugin.json` plus `commands/`, `agents/`, `skills/`,
`hooks/` directories. Firehorse Workflows project to Claude `commands/`, Agent
Roles project to Claude `agents/`, and Firehorse Skills project to Claude
`skills/`. Exposed generated commands, skills, shared subagents, and plugin
dependencies are listed explicitly in `.claude-plugin/plugin.json`.
Runtime-heavy upstreams
such as `claude-mem` stay as separate Claude plugin dependencies instead of
being merged into Firehorse's own hook/MCP/runtime files. Firehorse ships a
setup-time helper that patches installed claude-mem bundles to honor explicit
`CLAUDE_MEM_PROJECT` / `FIREHORSE_PROJECT_NAME` values; without those env vars,
upstream claude-mem keeps its own project derivation.

Discovery is via the repo-level `.claude-plugin/marketplace.json`, so users
add the marketplace once and install the plugin in one go.

A `SessionStart` hook checks the latest GitHub release for `cinjoff/firehorse`
and suggests `/plugin update firehorse@firehorse` when the plugin manifest
version is behind. The release notes URL is surfaced as the changelog.

### Why distributions are siblings, not derived

A naive design would build firehorse-claude on top of firehorse-pi (or vice
versa). We don't, because each ecosystem has different idioms:

- Pi packages are loaded by file convention; agents are TypeScript extensions.
- Claude plugins are loaded by directory convention; agents are Markdown.

The Firehorse Definition Format is a narrow authoring source for Firehorse-
authored workflows, skills, and agent roles; it is not a runtime layer and does
not replace distribution idioms. Generated mirrors still land in each provider's
native surfaces, while each distribution package owns its packaging, install,
and runtime conventions.

## Per-project setup

Both distributions will expose `horse-new-project` through generated provider-
native mirrors once the Firehorse Definition Format projection generator exists.
It is the Firehorse counterpart to `fh:new-project`. It does not initialize GSD,
`.planning/`, or observability scaffolding. Instead, it runs a lightweight
product/business discovery interview, creates or syncs durable project anchors
under `docs/`, and updates a marked section in cross-provider `AGENTS.md` when
needed.

The target anchor set is `docs/PROJECT.md`, `docs/DESIGN.md`, and
`docs/codebase/{ARCHITECTURE,STRUCTURE,CONVENTIONS,TESTING,INTEGRATIONS,CONCERNS}.md`.
`docs/PROJECT.md` uses long-lived product anchor sections: vision, target users,
problem, value proposition, success criteria, constraints, and open questions.
Product anchors can exist before code. `docs/PROJECT.md` is the periodically
updated high-level picture that future PRDs reference rather than duplicate.
`docs/DESIGN.md` is created only when brand/design language is actually defined.
Codebase anchors are split by topic, include source commit/hash and timestamp
freshness metadata, and are created only when an actual codebase exists or after
starter setup runs.
Brownfield mode analyzes existing code before asking questions and fills missing
codebase anchors. Brand definition is optional; users can invoke the bundled
Impeccable skill during setup or defer it. When the stack uses shadcn/ui and the
flow defines `docs/DESIGN.md`, `new-project` derives a shadcn preset from that
design direction and initializes/applies it through the shadcn CLI before UI
component implementation.

The setup flow explains technical options in non-technical language. With
explicit user opt-in, and with confirmation before each external mutation, it may
run starter app, hosting, database/auth, and dependency setup automation, but it
never performs Sentry/observability setup. If the user is not ready to scaffold
code, it can stop after product discovery and project anchors, then recommend
deeper requirements grilling before GitHub issues are drafted. Before issue drafting, the workflow runs the bundled `setup-matt-pocock-skills`
setup behavior so issue tracker, triage labels, and domain-doc expectations are
recorded for `to-prd` / `to-issues`. Issue drafting references the bundled
`to-prd` / `to-issues` behavior rather than copying their full templates:
synthesize PRD-level context, break work into tracer-bullet vertical slices,
include setup/infrastructure and product slices, write local drafts under zero-
padded paths such as `docs/prds/prd-0001-{slug}.md` and
`docs/issues/issue-0001-{slug}.md`, ask approval, then create issues with labels
and an `MVP` milestone. Drafts are retained after publishing and updated with
GitHub issue links. GitHub CLI authentication is required before approved issues are
created, but missing `gh` must not block writing the project anchors or local
drafts. Starter repos default to private GitHub repos from
`cinjoff/fh-starter-project`; existing repository content is preserved and
overlaid onto the starter rather than discarded. In existing repos, the starter
is copied from a temporary checkout, non-conflicting files are copied by default,
and conflicts are reported for approval before any replacement. After starter setup creates
code, the workflow runs codebase mapping so docs reflect the resulting codebase.
Technical choices use fixed, non-technical explanations in the workflow. The
future canonical workflow ID is `new-project`; `horse-new-project` is the
provider-native invocation name that follows Firehorse's generated-resource name
prefix convention.

## What is intentionally not here

- No skill / agent runtime. Definition schema, validation, and build-time
  projection are scoped for Phase 2; loader, prompt assembly, and tool wiring are
  still deferred. Vendored upstream skills are static distribution content only.
- No provider transport (HTTP clients, SSE parsing). Capabilities are
  declared; execution is not wired.
- No CLI. The framework is a library first.
- No persistence, no caching, no telemetry.
- No hand-authored firehorse command/agent/prompt runtime. Firehorse-authored
  definitions may produce checked-in generated mirrors during Phase 2, but
  current distribution content is static upstream mirrors, curated Pi package
  re-exports, and non-blocking update-check hooks.

These are deferred until the skill model is decided.
