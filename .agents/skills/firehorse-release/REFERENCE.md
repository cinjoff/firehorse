# Firehorse release reference

## Release context files

Read these before cutting a release:

- `AGENTS.md` and `CLAUDE.md`
- `.planning/STATE.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `.planning/DECISIONS.md`
- `.planning/PROJECT.md`
- `docs/ARCHITECTURE.md`
- `docs/UPSTREAM-SKILLS.md`
- `README.md`
- `packages/*/README.md`
- `package.json`
- `packages/firehorse-core/package.json`
- `packages/firehorse-pi/package.json`
- `packages/firehorse-claude/package.json`
- `packages/firehorse-claude/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `packages/firehorse-pi/firehorse.update.json`
- `packages/firehorse-claude/firehorse.update.json`

## Preflight checklist

```sh
git status --short
git branch --show-current
git tag --sort=-v:refname | head -20
gh auth status
pnpm --version
node --version
```

If working tree changes are unrelated to the release, stop and ask. If release
changes are already present, preserve them and continue.

## Upstream freshness check

Run first:

```sh
pnpm upstreams:check
```

Interpretation:

- Exit `0`: all pinned upstreams and bundled Pi packages are current.
- Non-zero with `update available`: summarize the upstream, pinned version/commit,
  latest version/commit, and suggested action.
- Network/auth failure: report uncertainty; do not pretend upstreams are current.

Suggested actions:

| Source | Action |
| --- | --- |
| `mattpocock/skills` | `pnpm upstreams:update:mattpocock-skills`, then review adapter mirrors. |
| `pbakaus/impeccable` | `pnpm upstreams:update:impeccable`, then review adapter mirrors. |
| `pi-subagents` npm package | Bump dependency/version, refresh shared agent mirrors if built-ins changed, review `firehorse.subagents.json`. |
| Bundled Pi packages (`context-mode`, `pi-lens`, `pi-mcp-adapter`, `pi-mermaid`, `pi-web-access`) | Bump `firehorse-pi` dependency and lockfile, review exposed resources and docs. |

If updates exist, ask whether to upgrade before release or intentionally release
with current pinned upstreams. Record the decision in release notes when useful.

## README refresh checklist

Root `README.md` should include:

- Purpose and release status.
- Install instructions for Pi.dev, Claude Code, and the core library.
- ASCII wiring diagram.
- Monorepo package layout.
- Core provider and orchestrator adapter roles.
- Pi package manifest/bundling model.
- Claude plugin model.
- Pinned upstream skill/agent repositories.
- Bundled Pi packages with versions and exposed resources.
- All exposed skills with descriptions/roles.
- Shared subagent role table.
- Firehorse-specific overrides/customizations.
- Maintainer workflow and release skill pointer.
- License/provenance links.

Good sources for generated sections:

```sh
node -e 'console.log(JSON.stringify(require("./package.json").pi, null, 2))'
node -e 'console.log(JSON.stringify(require("./packages/firehorse-pi/package.json").pi, null, 2))'
find packages/firehorse-pi/skills -name SKILL.md -maxdepth 6
find packages/firehorse-claude/agents -name "*.md" -maxdepth 2
find packages/firehorse-core/upstreams -name UPSTREAM.json -maxdepth 3
```

When command output is large, process it in code and print summaries only.

## Version bump checklist

For version `X.Y.Z`, update:

- `package.json` (`version`)
- `packages/firehorse-core/package.json`
- `packages/firehorse-pi/package.json`
  - top-level `version`
  - `firehorse.updateManifest.version`
  - `firehorse.updateManifest.bundledPiPackages` if bundled deps changed
- `packages/firehorse-claude/package.json`
- `packages/firehorse-claude/.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
  - top-level marketplace `version`
  - plugin entry `version`
- `packages/firehorse-pi/firehorse.update.json`
- `packages/firehorse-claude/firehorse.update.json`
- `pnpm-lock.yaml` when dependency versions changed
- READMEs/docs that mention the changed version
- `CHANGELOG.md` / release notes

`pnpm upstreams:write-update-manifests` can regenerate Firehorse update manifests,
but always inspect the diff afterward.

## Quality gates

Minimum local gates:

```sh
pnpm upstreams:check
pnpm typecheck
pnpm build
pnpm test
```

Optional package sanity checks before npm publishing (only when publishing is in
scope):

```sh
mkdir -p .release
pnpm --filter firehorse pack --pack-destination .release
pnpm --filter firehorse-pi pack --pack-destination .release
```

Do not publish npm packages by default. Ask for explicit user confirmation and
verify npm auth if publishing is requested.

## GitHub Actions handling

Before pushing:

```sh
find .github/workflows -maxdepth 1 -type f -name "*.yml" -o -name "*.yaml"
gh workflow list
```

If workflows are missing, say so. Do not invent release/publish secrets. If the
user wants CI added, create a minimal workflow that runs install, upstream check,
typecheck, build, and test on pushes/PRs/tags.

After pushing the release commit/tag:

```sh
sha=$(git rev-parse HEAD)
gh run list --commit "$sha" --limit 10
gh run watch --exit-status
```

If no workflows ran, include that in the release report.

## GitHub release commands

Use annotated tags:

```sh
version=0.1.0
tag="v$version"

git status --short
git add README.md CHANGELOG.md package.json pnpm-lock.yaml packages .claude-plugin .agents docs .planning
git commit -m "Release $tag"
git tag -a "$tag" -m "Firehorse $tag"
git push origin HEAD
git push origin "$tag"
gh release create "$tag" \
  --title "Firehorse $tag" \
  --notes-file .release/notes-$tag.md
```

If the tag already exists locally or remotely, stop and inspect before deleting
or moving it.

## Release notes template

```markdown
## Firehorse vX.Y.Z

### Highlights

- ...

### Packages

- `firehorse` vX.Y.Z
- `firehorse-pi` vX.Y.Z
- `firehorse-claude` plugin vX.Y.Z

### Upstreams bundled or mirrored

- `context-mode` ...
- `pi-lens` ...
- `pi-mcp-adapter` ...
- `pi-mermaid` ...
- `pi-subagents` ...
- `pi-web-access` ...
- `mattpocock/skills` pinned at ...
- `pbakaus/impeccable` pinned at ...

### Validation

- `pnpm upstreams:check`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- GitHub Actions: ...
```

## Final report shape

```markdown
Released Firehorse vX.Y.Z

- Tag: `vX.Y.Z`
- Commit: `<sha>`
- GitHub release: <url>
- Upstream status: all current / intentionally pinned / updates deferred
- Local validation: ...
- GitHub Actions: ...
- Follow-ups: ...
```
