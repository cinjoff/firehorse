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

## pi-subagents built-in agents

Current upstream:

- Source: <https://github.com/nicobailon/pi-subagents>
- Pinned npm package: `pi-subagents@0.24.2`
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

## Checking for upstream changes

```sh
pnpm upstreams:check
```

The command compares each `UPSTREAM.json` pinned commit with the current remote
ref and checks bundled upstream Pi packages such as `context-mode`, `pi-lens`,
`pi-mcp-adapter`, `pi-mermaid`, `pi-subagents`, and `pi-web-access` against
npm. It exits non-zero when an upstream update is available, which makes it
suitable for scheduled CI later.

## Updating an upstream

```sh
pnpm upstreams:update:mattpocock-skills
pnpm upstreams:update:impeccable
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
