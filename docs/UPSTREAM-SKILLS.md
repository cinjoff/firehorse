# Upstream skills

Firehorse depends on upstream plugins and vendors nothing (D-137). An upstream
skill stays in the plugin that ships it; Firehorse references it from a workflow
and orchestrates it.

This replaces the earlier model, in which core held a pinned copy of each
upstream repository under `packages/firehorse-core/upstreams/` with an
`UPSTREAM.json` provenance file, and each distribution carried generated
mirrors. That copy went stale, upstream renamed most of what it mirrored, and a
second copy of a plugin you already install bought nothing.

## How a workflow names an upstream skill

A workflow declares `upstreamSkills` in its frontmatter, one entry per skill:

```yaml
upstreamSkills:
  - upstream: mattpocock-skills
    id: wayfinder
```

`upstream` is the plugin name and `id` is the skill's frontmatter `name`. See
[the definition format](./FIREHORSE-DEFINITION-FORMAT.md) for the rest of the
frontmatter contract.

Plugins Firehorse depends on are declared in `.claude-plugin/marketplace.json`
and `packages/firehorse-claude/.claude-plugin/plugin.json`, so installing the
Firehorse plugin pulls them in. Phase 2 of
[the migration plan](./MIGRATION-PLAN.md) adds those declarations.

## The drift-check lockfile

Everything in this section is the design settled on
[Design the drift-check lockfile format](https://github.com/cinjoff/firehorse/issues/49),
built in Phase 4. The diffing and impact logic lives in
`packages/firehorse-core/src/upstreams/` as pure functions; the filesystem and
`~/.claude/plugins/` reads are at the edges in `scripts/`.

Upstream plugins ship continuously, so a skill can be renamed or rewritten under
a Firehorse workflow without any version changing. The lockfile records a
baseline that a check can compare against what is installed on disk.

`upstreams.lock.json` lives at the repo root, beside `pnpm-lock.yaml` — not
under `packages/firehorse-core/`, which is published to npm and has no business
carrying a repo-local baseline. It records, per declared plugin: the marketplace,
the version, and every skill it exposes with that skill's path and a SHA-256.

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-09-11T09:24:00.000Z",
  "plugins": {
    "mattpocock-skills": {
      "marketplace": "claude-plugins-official",
      "version": "1.2.3",
      "skills": {
        "wayfinder": {
          "path": "skills/engineering/wayfinder/SKILL.md",
          "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
          "nameSource": "frontmatter"
        }
      }
    }
  }
}
```

The hash covers the whole `SKILL.md`, frontmatter included: `description` decides
whether a skill gets invoked at all, so rewriting it is a behavior change worth
reporting. Bytes are read as UTF-8 with CRLF normalized to LF before hashing,
and nothing else is trimmed.

A skill's key is its frontmatter `name`, falling back to the containing
directory name when the frontmatter omits one, because the frontmatter name is
what an `upstreamSkills` entry references and what a session invokes.
`nameSource` records which of the two was used, so a name that later appears in
frontmatter reads as a change rather than a mystery.

`plugins` is ordered by name and `skills` by key, both ASCII-sorted, following
the rule the generated manifests already use. A real change is then the only
thing that shows in a diff.

A plugin enters the file because Firehorse declares it, not because it happens
to be installed. On-disk truth is read from `~/.claude/plugins/`.

### The manifest decides which skills exist

A plugin's `.claude-plugin/plugin.json` `skills` field is the authority on what
the plugin exposes — an array of skill directories, or a single directory to
scan. Do not change this to walk the on-disk tree instead. A skill directory
that the manifest omits is one Claude Code never loads, so an `upstreamSkills`
entry naming it is genuinely broken, and reporting it as missing is correct.
Consulting the tree would quietly start accepting references to skills no
session can invoke.

`mattpocock-skills` 1.2.3 makes the gap concrete: it lists 25 paths under
`skills/engineering/` and `skills/productivity/`, while the tree holds 35
directories. The 10 extras sit under `skills/in-progress/` and `skills/misc/`
and are unavailable at runtime, so the lockfile records 25. A plugin whose
manifest has no `skills` field is scanned under `skills/`, which is the only
case where the tree is the authority.

### What breaks the build and what only gets reported

Breaking — the command exits non-zero and `definitions:check` fails:

- A skill named by an `upstreamSkills` entry is absent from the installed
  plugin. The report names every workflow that references it.
- A declared plugin is installed but has no lockfile entry, or the lockfile
  names a plugin Firehorse no longer declares. The lockfile is stale either way,
  which makes its comparisons worthless.

Advisory — reported, exit 0:

- A skill's `sha256` changed. The instructions moved under a stable name, so an
  orchestration may drift without breaking.
- A plugin's `version` or `marketplace` changed.
- A skill ID appeared, or vanished with no definition referencing it.

### Commands

```sh
pnpm upstreams:check           # compare the lockfile against ~/.claude/plugins/
pnpm upstreams:check --write   # rewrite the lockfile from disk and print what moved
```

The check never writes without `--write`. Hand-editing the lockfile is not a
supported path: the output is deterministic, so the way to accept a new baseline
is to run `--write` and review the diff in the commit. `--write` refuses to run
when `~/.claude/plugins/` is missing, since there is nothing to read a baseline
from.

`pnpm definitions:check` — which `pnpm typecheck` and CI already run — validates
every `upstreamSkills` reference with the same data, so upstream breakage fails
the existing gate. Its diagnostic quotes what it resolved against.

Set `FIREHORSE_CLAUDE_PLUGINS_DIR` to point either command at a copy of the
plugins directory instead of `~/.claude/plugins/`. That is how the rename case is
exercised against a real install without touching it.

### CI, where no plugins are installed

`~/.claude/plugins/` does not exist on CI, so its absence is not drift. When the
directory is missing, `pnpm upstreams:check` prints one line, skips the on-disk
comparison, and exits 0. The reference check folded into `definitions:check`
then degrades to a lockfile-only pass: every `upstreamSkills` reference must
resolve to a skill recorded in `upstreams.lock.json`. The gate stays meaningful
without lying about what it compared.

A declared plugin that is not installed while the directory does exist is
breaking. That is real drift, not a missing environment.
