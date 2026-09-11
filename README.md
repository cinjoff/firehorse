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

Firehorse depends on three upstream plugins: `mattpocock-skills` from the
official `claude-plugins-official` marketplace, `impeccable` from
`pbakaus/impeccable`, and `supermemory` from `supermemoryai/claude-supermemory`.
Claude Code installs all three along with Firehorse. Add the other marketplaces
first, because Claude Code cannot resolve a dependency from a marketplace it does
not know about yet.

```text
/plugin marketplace add pbakaus/impeccable
/plugin marketplace add supermemoryai/claude-supermemory
/plugin marketplace add cinjoff/firehorse
/plugin install firehorse@firehorse
```

Then run the setup skill once:

```text
firehorse-setup
```

Use `firehorse-setup --check` for a read-only status report.

### codebase-memory-mcp

The workflows query a codebase knowledge graph through `codebase-memory-mcp`.
That is an MCP server, not a plugin, so Firehorse does not bundle it and
`/plugin install` does not pull it in. Install the server from its own upstream,
then register it at user scope so every project sees it:

```sh
claude mcp add --scope user codebase-memory-mcp <path-to-codebase-memory-mcp>
```

### Memory

Recall across sessions comes from a self-hosted supermemory server on
`localhost:6767`, plus the `firehorse-recall` skill for deliberate queries. The
plugin installs with Firehorse; the server does not. Set it up once, following
[the memory runbook](./docs/MEMORY.md):

```sh
npx -y supermemory@latest local install
ollama pull gpt-oss:20b
```

The extraction model must support tool calling, and it must stay resident. The
runbook explains both, and why each one fails quietly if you skip it.

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
- [Memory runbook](./docs/MEMORY.md)
- [Definition format](./docs/FIREHORSE-DEFINITION-FORMAT.md)
- [Claude plugin README](./packages/firehorse-claude/README.md)
- [Changelog](./CHANGELOG.md)

## License

Firehorse is MIT licensed.
