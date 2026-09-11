# Architecture

Firehorse is personal tooling packaged as one Claude Code plugin (D-136). It
holds a small set of workflow definitions, a projector that turns them into
Claude-native commands, and two adapter families that tell a definition what
provider and orchestrator it is running under. Everything a user invokes is a
generated slash command.

The repo carries two packages:

- `packages/firehorse-core` — the `firehorse` npm library. It owns the
  definition format (schema, parser, validator, projector, manifest merge), the
  provider and orchestrator adapters, the `.firehorse/manifest.json` schema, and
  the canonical definitions under `definitions/`.
- `packages/firehorse-claude` — the Claude Code plugin. It owns
  `.claude-plugin/plugin.json`, the generated `commands/firehorse/` and
  `skills/firehorse/` trees, the hand-authored `skills/firehorse-setup/` skill,
  and the `hooks/` scripts.

`.claude-plugin/marketplace.json` at the repo root exposes the plugin, so you
add the marketplace once and install `firehorse` from it.

Claude-adapted commands, skills, and hooks belong in `packages/firehorse-claude`.
`firehorse-core` stays free of provider packaging.

## Definitions project to one target

Canonical definitions live under `packages/firehorse-core/definitions/`, in a
directory per kind. `workflows/` is the only populated kind today; the schema and
the projector also accept `kind: skill` under `skills/`.

Each definition is a Markdown file whose frontmatter carries `schemaVersion`
(currently `1`), `id`, `kind`, `title`, `description`, the optional
`argumentHint`, and the optional `requires` / `optional` capability blocks. The
body carries the instructions. `packages/firehorse-core/src/definitions/parser.ts`
parses it with `gray-matter`, validates the frontmatter against a Zod schema in
`types.ts`, checks that the file's path matches its `kind` and `id`, and requires
the section headings listed in `requiredSectionsByKind` — for a workflow:
Purpose, Usage, Inputs, Outputs, Supporting Capabilities, Orchestration Intent,
Safety Gates, Procedure, Projection Notes. IDs are globally unique across kinds,
and `validation.ts` enforces that plus alias collisions and `replacedBy` targets.

`projection.ts` emits one file per definition:

```
definitions/workflows/<id>.md  →  packages/firehorse-claude/commands/firehorse/horse-<id>.md
definitions/skills/<id>.md     →  packages/firehorse-claude/skills/firehorse/<id>/SKILL.md
```

Generated files are not hand-editable. Each one opens with provenance —
`firehorseGenerated`, `firehorseKind`, `firehorseId`, `firehorseSource`,
`firehorseSourceSha256`, `firehorseSchemaVersion` in the frontmatter, plus an
HTML comment naming the source path and hash. To change a generated file, edit
the canonical definition and regenerate.

`scripts/definitions.ts` drives both directions. `pnpm definitions:write` writes
mirrors and updates manifests; `pnpm definitions:check` fails when a mirror is
missing, stale, or orphaned, and `pnpm typecheck` runs it first. The script
refuses to overwrite a target that carries no Firehorse provenance, and it
removes a provenanced mirror whose canonical source is gone.

One manifest receives the generated entries:
`packages/firehorse-claude/.claude-plugin/plugin.json`. `manifests.ts` rewrites
only the entries under the `./commands/firehorse/` and `./skills/firehorse/`
prefixes and sorts them, so hand-maintained entries such as
`./skills/firehorse-setup` survive and a diff shows a real change.

## The workflows you invoke

Seven workflow definitions sit under `definitions/workflows/`, and their
generated commands are the user-facing surface. They orchestrate upstream skills
rather than restating them, and a workflow is the only carrier Firehorse uses for
standing preferences (D-140).

- `new-project` — stands a repo up for Firehorse: remote, tracker, the label
  vocabulary created in the tracker, `setup-matt-pocock-skills`,
  `.firehorse/manifest.json` at schema version 2, and an interviewed `DESIGN.md`.
  Run it once per repo, before the others.
- `index` — indexes the repo into `codebase-memory-mcp` and supermemory, writes
  `docs/codebase/ARCHITECTURE.md`, `STRUCTURE.md`, and `CONVENTIONS.md` from the
  graph, and records freshness in the manifest by commit ancestry. It never
  writes `DESIGN.md` (D-146).
- `map` — charts a wayfinder map from a loose idea, or works through an existing
  one, and fills the map's `## Notes` from what this repo actually has so later
  sessions inherit the preferences.
- `build` — takes one ticket to a committed change: establish the affected seam
  from the graph, prototype first when the UI shape is uncertain, implement
  test-first, and report verification evidence.
- `fix-bug` — builds the failing feedback loop, enumerates the failing symbol's
  callers before hypothesising, and reports regression evidence from both sides
  of the fix.
- `ship` — runs the release sequence behind a green gate: review, PR, merge,
  changelog entry, tag, release, and one closing comment per resolved issue.
- `upstreams-check` — reports upstream skill drift and what it costs, naming the
  workflows whose `upstreamSkills` reference a moved skill and the body steps at
  risk.

## Providers and orchestrators

The adapters stay because a definition should not name a vendor SDK. They
declare capabilities and detect their environment; neither family executes
anything.

A provider (`packages/firehorse-core/src/providers/provider.ts`) exposes `id`,
`displayName`, `capabilities` (streaming, tool use, vision, parallel tool calls),
and `isAvailable()`, a pure read of env vars and installed CLIs. `index.ts`
registers `ClaudeProvider` and `CodexProvider`. Add one by extending
`BaseProvider` and adding it to `builtinProviders`. Only Claude has a
distribution package; the Pi provider and its package went with D-138, and you
can recover them from the `pi-v0.3.0` tag.

An orchestrator (`orchestrators/orchestrator.ts`) exposes `id`, `displayName`,
`capabilities` (worktrees, parallel agents, port assignment, shared filesystem),
a synchronous `detect(env)`, and `readEnvironment(env)`, which extracts
`rootPath`, `workspacePath`, `workspaceName`, and `port` when the env carries
them. `detect.ts` walks `orchestratorChain` in order and takes the first adapter
whose `detect()` returns true:

1. Superset — `SUPERSET_WORKSPACE_NAME` / `SUPERSET_ROOT_PATH`.
2. Conductor — `CONDUCTOR_WORKSPACE_NAME` / `CONDUCTOR_ROOT_PATH`.
3. tmux — `TMUX`.
4. Terminal — always matches, so the chain always resolves.

Detection reads env vars only. It makes no network calls and writes nothing.

## Upstream skills

Firehorse depends on upstream plugins and vendors nothing (D-137). A workflow
names a skill in its frontmatter as a flat `upstreamSkills` list of
`{upstream, id}` entries (D-142), where `upstream` is the plugin name and `id` is
the skill's frontmatter `name`; ordering lives in the workflow body.

`packages/firehorse-claude/.claude-plugin/plugin.json` and the repo-root
`.claude-plugin/marketplace.json` declare the plugins — `mattpocock-skills` from
`claude-plugins-official` and `impeccable` from `impeccable` — so installing
Firehorse pulls them in. The skill itself stays in the plugin that ships it.

Upstream plugins ship continuously, so a skill can be renamed or rewritten under
a workflow without any version changing. The planned drift mechanism is a
root-level `upstreams.lock.json` baseline plus a `pnpm upstreams:check` that
compares it against the plugins installed on disk. **Neither exists yet**; Phase 4
of [the migration plan](./MIGRATION-PLAN.md) builds them, and
[the upstream skills doc](./UPSTREAM-SKILLS.md) records the lockfile design. The
`upstreams-check` workflow is written against that mechanism, so its command is
installed ahead of the script it calls.

## Per-project state

`.firehorse/manifest.json` records what setup and indexing have done in a repo.
`packages/firehorse-core/src/setup/index.ts` owns its Zod schema at
`schemaVersion: 2`: `setup.mattPocockSkills` (version and timestamp),
`index` (`commit`, `at`, `graph`, `supermemory`), `anchors` (`design`,
`codebase`), and `upstreams.checkedAt`. The same module computes index staleness
from git facts a caller supplies — `computeFirehorseIndexStaleness` never shells
out itself.

The plugin registers two `SessionStart` hooks in `hooks/hooks.json`, each with a
five-second timeout. `check-setup.mjs` reads the manifest, runs at most three git
commands, prints at most one `firehorse:` line, and exits 0 on every path —
malformed JSON, absent git, absent manifest, unknown `schemaVersion`. Silence is
the healthy state. It reports state and never injects rules, which keeps it clear
of D-145. `check-update.mjs` checks the latest GitHub release for
`cinjoff/firehorse` on a throttle and honours `FIREHORSE_SKIP_UPDATE_CHECK`,
`FIREHORSE_OFFLINE`, `CLAUDE_OFFLINE`, and `CI`.

The hooks duplicate their checks in plain JavaScript on purpose: a hook runs
before anything in the workspace is built, so it must not import from it.

## Memory

Memory is self-hosted supermemory, reached through `npx supermemory` rather than
an MCP shim (D-143, D-144). A local server on 6767, local embeddings, and Ollama
for extraction keep it offline.

Two halves reach it. The supermemory plugin's four REST hooks capture each
session and inject what they judge relevant; they are a declared dependency, so
Claude Code installs them with Firehorse. The `firehorse-recall` skill
(`definitions/skills/firehorse-recall.md`) wraps `npx supermemory search|add`
for deliberate recall, invoked explicitly and never as a reflex (D-145).

The server itself is not a repo artifact — it is machine setup, and
[`MEMORY.md`](./MEMORY.md) is its runbook. The `index` and `map` workflows read
`SUPERMEMORY_API_URL` and record `index.supermemory: false` when the server is
absent, so they run without it.

## What is intentionally not here

- No skill or agent runtime. The definition format is an authoring source with
  build-time projection — there is no loader, no prompt assembly, and no tool
  wiring.
- No provider transport. Capabilities are declared; nothing connects.
- No CLI. `firehorse-core` is a library, and `scripts/definitions.ts` is a repo
  script rather than a published binary.
- No agent definitions. `kind: agent-role` and the nine agents went with D-141;
  workflows run their steps inline.
- No vendored upstream content, and no second copy of a plugin you already
  install (D-137).
