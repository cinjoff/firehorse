# firehorse

Core library for firehorse.

This is the **library** — the canonical definitions, the Firehorse Definition
Format parser and validator, the projection generator, the upstream drift check,
and the `.firehorse/manifest.json` schema. It has no runtime opinion about how
skills are loaded or executed.

It is not published. Firehorse is distributed as a Claude Code plugin through
the repo-level marketplace, and this package is `private`; nothing outside this
repo consumes it. For the framework as a whole, see the
[workspace README](../../README.md).

## What is in here

- `src/definitions/` — schema, parser, validator, projector, manifest merge.
- `src/upstreams/` — the `upstreams.lock.json` format and the drift check.
- `src/setup/` — the `.firehorse/manifest.json` schema.
- `definitions/` — the canonical workflow and skill sources.

## Canonical definitions

Firehorse-authored definitions live under `definitions/{workflows,skills}/`. The
projector in `src/definitions/` renders them into the Claude plugin's
`commands/` and `skills/` directories.

Use these workspace scripts from the repo root:

```sh
pnpm definitions:write
pnpm definitions:check
```

