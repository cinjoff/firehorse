# firehorse

Firehorse is personal Claude Code tooling: a workflow spine that orchestrates
upstream plugin skills, packaged as a Claude Code plugin.

It owns the definition format and the projector, the workflows that add
something upstream does not do, a drift check for upstream renames, and repo
setup state. Everything else comes from plugins you install. Firehorse depends
on upstream plugins and vendors nothing.

This repo is mid-migration. [`docs/MIGRATION-PLAN.md`](./docs/MIGRATION-PLAN.md)
is the settled plan and the source of truth; decisions D-136 through D-150 there
are binding. The Pi distribution, the vendored upstream mirrors, the agent
roster, and the claude-mem wiring are gone as of this migration — recoverable
from the `pi-v0.3.0` tag.

## Install

```text
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

Then run the setup skill once:

```text
firehorse-setup
```

Use `firehorse-setup --check` for a read-only status report.

The core library is published separately for adapter contracts and the
definition format. It is not a skill runtime.

```sh
pnpm add firehorse
```

## Packages

- **`packages/firehorse-core`** (`firehorse` on npm) — canonical definitions,
  the Firehorse Definition Format v1 parser and validator, the projection
  generator, and provider/orchestrator adapter contracts.
- **`packages/firehorse-claude`** — the Claude Code plugin. Generated commands
  and skills, the `firehorse-setup` skill, and `SessionStart` hooks. Discovered
  through the repo-level `.claude-plugin/marketplace.json`.

## Definition authoring

Canonical definitions live in
`packages/firehorse-core/definitions/{workflows,skills}/` as Markdown files with
schema-versioned frontmatter. See
[the definition format](./docs/FIREHORSE-DEFINITION-FORMAT.md) for the v1
contract.

```sh
pnpm definitions:write  # regenerate the checked-in Claude mirrors + manifest
pnpm definitions:check  # non-mutating freshness and safety check
```

Generated mirrors carry Firehorse provenance and a SHA-256 of their source. Edit
the canonical definition, never the generated mirror.

The workflow set is empty right now: Phase 3 of the migration plan adds the
seven workflows, and Phase 2 declares the upstream plugins they orchestrate.

## Development

```sh
pnpm install
pnpm typecheck
pnpm build
pnpm test
```

## Further reading

- [Migration plan](./docs/MIGRATION-PLAN.md)
- [Decisions](./docs/DECISIONS.md)
- [Project vision and scope](./docs/PROJECT.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Definition format](./docs/FIREHORSE-DEFINITION-FORMAT.md)
- [Claude plugin README](./packages/firehorse-claude/README.md)
- [Changelog](./CHANGELOG.md)

## License

Firehorse is MIT licensed.
