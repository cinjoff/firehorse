# Upstream skills and agents

Firehorse can vendor third-party skill repositories and shared agent definitions
while keeping a curated public surface for each adapter.

## Model

Upstream skills and agents have three layers:

1. **Pinned source in core** — `packages/firehorse-core/upstreams/<name>/`
   stores the copied upstream files, license, and `UPSTREAM.json` provenance.
2. **Adapter mirrors** — Pi and Claude receive generated copies or consume a
   pinned bundled package under their own idiomatic package directories.
3. **Adapter manifests** — each adapter decides which mirrored skills / agents
   are visible to users.

This keeps provenance and maintainer-side update tracking in core, while still
shipping self-contained Pi and Claude packages. End users do not check upstream
repositories directly; they update Firehorse package/plugin versions.

## mattpocock/skills

Current upstream:

- Source: <https://github.com/mattpocock/skills>
- Pinned commit: see
  `packages/firehorse-core/upstreams/mattpocock-skills/UPSTREAM.json`
- Selection policy: expose the skills listed by the upstream Claude plugin
  manifest. Deprecated, in-progress, personal, and misc skills are not exposed
  unless Firehorse explicitly allow-lists them later.

Generated locations:

- Core source: `packages/firehorse-core/upstreams/mattpocock-skills/`
- Claude mirror: `packages/firehorse-claude/skills/mattpocock/`
- Pi mirror: `packages/firehorse-pi/skills/mattpocock/`

## pbakaus/impeccable

Current upstream:

- Source: <https://github.com/pbakaus/impeccable>
- Pinned commit: see
  `packages/firehorse-core/upstreams/impeccable/UPSTREAM.json`
- Selection policy: expose the skill directories exported by the upstream
  Claude plugin manifest. Core keeps the canonical upstream `skill/` source for
  provenance; adapter mirrors use the upstream-generated Claude and Pi variants
  with script references normalized to skill-relative paths.

Generated locations:

- Core source: `packages/firehorse-core/upstreams/impeccable/`
- Claude mirror: `packages/firehorse-claude/skills/pbakaus/impeccable/`
- Pi mirror: `packages/firehorse-pi/skills/pbakaus/impeccable/`

## shadcn/ui

Current upstream:

- Source: <https://github.com/shadcn-ui/ui>
- Pinned commit: see
  `packages/firehorse-core/upstreams/shadcn-ui/UPSTREAM.json`
- Selection policy: expose the official `skills/shadcn` agent skill. Firehorse
  treats this skill as required for reliable shadcn/ui work because it carries
  the project-aware CLI, registry, component-composition, icon, base-vs-radix,
  Tailwind, and preset rules.

Generated locations:

- Core source: `packages/firehorse-core/upstreams/shadcn-ui/`
- Claude mirror: `packages/firehorse-claude/skills/shadcn-ui/shadcn/`
- Pi mirror: `packages/firehorse-pi/skills/shadcn-ui/shadcn/`

The Pi distribution exposes the `shadcn` skill for shadcn/ui tasks, but does
not grant it to the `worker` subagent by default yet. Firehorse's default
`pi-subagents` override manifest grants code-oriented Pi subagents the Pi-native
`memory_recall` tool from `pi-agent-memory` instead of Claude-only memory tool
names.

## claude-mem and pi-agent-memory

Current upstreams:

- Claude source: <https://github.com/thedotmack/claude-mem>
- Claude plugin package: `claude-mem@13.2.0`
- Claude pinned commit: see
  `packages/firehorse-core/upstreams/claude-mem/UPSTREAM.json`
- Pi adapter source: <https://github.com/ArtemisAI/pi-mem>
- Pi package: `pi-agent-memory@0.3.4`
- Pi pinned commit: see
  `packages/firehorse-core/upstreams/pi-agent-memory/UPSTREAM.json`
- Selection policy: keep the memory runtime owned by upstream. Pi bundles the
  `pi-agent-memory` package and exposes only its `pi-mem` extension plus
  `mem-search` skill. Claude declares `claude-mem` as a Firehorse marketplace
  dependency and installs the upstream plugin from its `plugin/` subdirectory;
  Firehorse does not merge claude-mem hooks, MCP server, worker scripts, or
  skills into the Firehorse plugin.

Generated / runtime locations:

- Core provenance: `packages/firehorse-core/upstreams/claude-mem/` and
  `packages/firehorse-core/upstreams/pi-agent-memory/`
- Pi runtime source: bundled
  `packages/firehorse-pi/node_modules/pi-agent-memory/` plus bundled
  `packages/firehorse-pi/node_modules/claude-mem/` worker scripts.
- Claude runtime source: Firehorse marketplace entry `claude-mem`, pinned to the
  upstream `plugin/` subdirectory via `git-subdir`.

The Pi adapter expects a claude-mem worker to be installed and running on
`CLAUDE_MEM_HOST` / `CLAUDE_MEM_PORT` (`127.0.0.1:37777` by default). Firehorse-
pi bundles the `claude-mem` npm package and starts/checks its worker scripts for
Pi-only harness use, so Claude Code is not a prerequisite. The Claude plugin
dependency remains the canonical Firehorse path for Claude Code users. Upstream
`npx claude-mem install` / plugin marketplace setup remains the fallback or
repair path; upstream documents `npm install -g claude-mem` as SDK/library-only
and not sufficient for hooks or worker startup.

Firehorse setup resolves the canonical repository project with
`gh repo view --json name --jq .name`, then pins `FIREHORSE_PROJECT_NAME`,
`CLAUDE_MEM_PROJECT`, and `PI_MEM_PROJECT` so memories remain under that project
across Superset / Conductor worktrees. Path-based Superset detection is only a
human hint; Firehorse does not rely on git parent directories or cwd basenames
for memory identity.

## pi-subagents built-in agents

Current upstream:

- Source: <https://github.com/nicobailon/pi-subagents>
- Pinned npm package: `pi-subagents@0.24.3`
- Selection policy: expose the upstream built-in agent set as Firehorse shared
  subagent definitions.

Generated / runtime locations:

- Core source: `packages/firehorse-core/upstreams/pi-subagents/agents/`
- Claude mirror: `packages/firehorse-claude/agents/`
- Pi runtime source: bundled `packages/firehorse-pi/node_modules/pi-subagents/agents/`

The Pi adapter currently consumes the upstream package's built-in agent files at
runtime. The core copy is the reviewed Firehorse provenance surface, and the
Claude mirror is adapted from that same pinned source with Claude-compatible
frontmatter.

## Checking for upstream drift

```sh
pnpm upstreams:check
```

The command reads the baseline in `upstreams.lock.json`, enumerates the declared
plugins as installed under `~/.claude/plugins/`, and reports impact rather than
change. A vanished or renamed skill ID that an `upstreamSkills` entry names is
**breaking**: the report lists the workflows that break and the command exits
non-zero. A changed `SKILL.md` hash, a changed plugin version or marketplace, an
added skill, and a vanished skill nothing references are **advisory**: reported,
exit 0.

`upstreams.lock.json` records, per declared plugin, its marketplace, its version,
and for every exposed skill the path, a SHA-256 of the whole `SKILL.md`
(frontmatter included, CRLF normalised to LF), and whether the key came from
frontmatter or the directory name. `plugins` is sorted by name and `skills` by
key, both ASCII, so a real change is the only thing that shows in a diff.

`~/.claude/plugins/` does not exist on CI, and absence is not drift. When the
directory is missing, `upstreams:check` prints one line, skips the on-disk
comparison, and exits 0; the reference check folded into `definitions:check`
degrades to a lockfile-only pass, where every `upstreamSkills` entry must resolve
to a skill recorded in `upstreams.lock.json`.

`pnpm definitions:check` — which `pnpm typecheck` and CI already run — validates
every `upstreamSkills` reference with the same data, so upstream breakage fails
the existing gate.

## Accepting a new baseline

```sh
pnpm upstreams:check --write
```

`--write` rewrites `upstreams.lock.json` from what is on disk and prints what
moved. It never writes without the flag, and it refuses to write when
`~/.claude/plugins/` is missing. Hand-editing is not a supported path: the output
is deterministic, so review the diff in the commit instead.

## Updating an upstream

```sh
pnpm upstreams:update:mattpocock-skills
pnpm upstreams:update:impeccable
pnpm upstreams:update:shadcn-ui
# For claude-mem / pi-agent-memory, update the pinned package versions,
# marketplace source SHA, and UPSTREAM.json manifests together.
pnpm upstreams:check
pnpm typecheck && pnpm build && pnpm test
```

Then review the diff. If accepted, bump/release the relevant Firehorse package
versions and write GitHub release notes describing the upstream change. Users
receive the updated upstream skills or agents by updating their Firehorse
package/plugin version; they do not install the upstream repository separately.

## User-facing update checks

Runtime update checks rely on Firehorse versions, not upstream repository state:

- Pi checks npm's latest `firehorse-pi` version and suggests
  `pi update npm:firehorse-pi`.
- Claude checks the latest `cinjoff/firehorse` GitHub release and suggests
  `/plugin update firehorse@firehorse`.

Because upstream skill and agent changes are released as Firehorse package/plugin
version bumps, these checks still cover upstream changes while keeping user
startup fast and reproducible. The GitHub release changelog is the user-facing
explanation of what changed.
