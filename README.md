# firehorse

Firehorse is personal Claude Code tooling: a workflow spine that orchestrates
upstream plugin skills, packaged as a Claude Code plugin.

It owns the definition format and the projector, the workflows that add
something upstream does not do, a drift check for upstream renames, and repo
setup state. Everything else comes from plugins you install. Firehorse depends
on upstream plugins and vendors nothing.

The Claude-only migration is complete.
[`docs/MIGRATION-PLAN.md`](./docs/MIGRATION-PLAN.md) is the settled plan and
decisions D-136 through D-150 there are binding. The Pi distribution, the
vendored upstream mirrors, the agent roster, and the claude-mem wiring are gone
— recoverable from the `pi-v0.3.0` tag.

## Install

One command. It adds the three upstream marketplaces, installs the plugin and
its dependencies, registers the MCP servers, and brings up the local memory
stack.

```sh
curl -fsSL https://raw.githubusercontent.com/cinjoff/firehorse/main/install.sh | bash
```

From a clone, run `./install.sh` instead.

Every step is idempotent, so re-running repairs rather than duplicates. To see
what is and is not set up without writing anything:

```sh
./install.sh --check
```

| Flag              | Effect                                         |
| ----------------- | ---------------------------------------------- |
| `--check`         | Report status. Writes nothing.                 |
| `--yes`           | Accept every prompt. For non-interactive runs. |
| `--skip-memory`   | Leave the self-hosted supermemory stack alone. |
| `--skip-superset` | Leave Superset MCP alone.                      |

Restart Claude Code afterwards so the plugin, its hooks, and the MCP servers
load.

### What the installer wires up

- **Marketplaces** — `pbakaus/impeccable`, `supermemoryai/claude-supermemory`,
  and `cinjoff/firehorse`. The first two come first, because Claude Code cannot
  resolve a dependency from a marketplace it does not know about yet.
- **The plugin** — `firehorse@firehorse`, which pulls `mattpocock-skills`,
  `impeccable`, and `supermemory` with it.
- **MCP servers** — `codebase-memory-mcp` for the structural queries the
  workflows run, and `supermemory-docs` for supermemory's public documentation.
- **Memory** — the self-hosted supermemory server on `localhost:6767`, the
  `gpt-oss:20b` extraction model, the server credentials, a launchd job so it
  survives a reboot, and the `SUPERMEMORY_API_URL` entries Claude Code needs in
  `~/.claude/settings.json`.
- **Superset MCP** — only when Superset is detected, and always through a
  `headersHelper` so the API key never lands in a config file.

Two things it cannot do for you. It installs the `codebase-memory-mcp` binary
only if you already have it — that server has its own upstream — and it needs
[Ollama](https://ollama.com) running before it can set up memory. It tells you
so and carries on rather than failing.

[The memory runbook](./docs/MEMORY.md) explains what the memory half does, and
why each piece fails quietly if it is missing.

### Doing it by hand

The installer is the supported path. If you would rather wire it up yourself,
the runbook and `install.sh` are both readable, and `./install.sh --check` will
tell you what is still missing.

The core library carries the adapter contracts and the definition format. It is
not a skill runtime, and it is not published to npm — Firehorse is personal
tooling (D-136). Consume it from the workspace.

## Packages

- **`packages/firehorse-core`** (`firehorse`, unpublished) — canonical definitions,
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
