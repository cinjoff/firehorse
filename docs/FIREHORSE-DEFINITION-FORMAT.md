# Firehorse Definition Format v1

Firehorse Definition Files are the canonical authoring source for
Firehorse-authored workflows and reusable skills. They live in
`packages/firehorse-core/definitions/` and project into checked-in Claude
mirrors.

The format is declarative authoring metadata plus Markdown instructions. It is
**not** a runtime, prompt loader, provider transport, slash-command
implementation, hook, or autonomous execution engine.

`packages/firehorse-core/src/definitions/types.ts` is the authority on the
schema. This document describes what that schema accepts; where the two
disagree, the schema wins.

`definitions/workflows/` holds the eight shipped workflows and
`definitions/skills/` holds `firehorse-recall`. Read any of them for a worked
example; this document describes the contract they satisfy.

## Layout

```text
packages/firehorse-core/definitions/
├── workflows/<id>.md
└── skills/<id>.md
```

`id`, `kind`, and path must agree: the parser requires each file to sit at
`definitions/<workflows|skills>/<id>.md`. IDs are globally unique across both
kinds and are stable public API. A rename needs `aliases`, `deprecated`, and
`replacedBy` metadata rather than a silent ID change.

## Common frontmatter

Both kinds share this field set. The schema is strict — an unrecognized
frontmatter key fails validation.

| Field           | Type     | Notes                                                                    |
| --------------- | -------- | ------------------------------------------------------------------------ |
| `schemaVersion` | integer  | Required, currently `1`.                                                 |
| `id`            | slug     | Required. Lowercase letters, numbers, single hyphens; 1-64 chars.        |
| `kind`          | enum     | Required. `workflow` or `skill`.                                         |
| `title`         | string   | Required, non-empty. Human-readable title.                               |
| `description`   | string   | Required, 1-1024 chars. Provider-facing summary.                         |
| `requires`      | object   | Optional. Provider-neutral required capabilities.                        |
| `optional`      | object   | Optional. Provider-neutral optional capabilities.                        |
| `audience`      | enum     | Optional. `user` (default) or `maintainer`. Picks the projection target. |
| `aliases`       | string[] | Optional. Historical IDs, each a slug.                                   |
| `deprecated`    | boolean  | Optional deprecation marker.                                             |
| `replacedBy`    | slug     | Optional replacement ID. Requires `deprecated: true`.                    |

### Capability declarations

`requires` and `optional` each take an object with up to four array fields:
`tools`, `orchestration`, `modalities`, and `environment`. A declaration must
name at least one category, and each category it names must list at least one
value.

| Category        | Common values                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| `tools`         | `read`, `grep`, `find`, `ls`, `bash`, `edit`, `write`, `web-search`, `fetch-content`, `get-search-content` |
| `orchestration` | `subagents`, `parallel-agents`, `worktrees`, `intercom`, `review-gates`                                    |
| `modalities`    | `text`, `vision`                                                                                           |
| `environment`   | `filesystem`, `git`, `github`, `node`, `pnpm`, `superset`, `conductor`, `tmux`, `terminal`                 |

Anything outside those lists must be extension-prefixed — a lowercase prefix, a
colon, then the rest, as in `mcp:github` or `provider:pi-subagents/intercom`.
Unprefixed values the category does not document fail validation.

## Workflow definitions

A workflow adds these fields:

| Field              | Type                 | Notes                                           |
| ------------------ | -------------------- | ----------------------------------------------- |
| `argumentHint`     | string               | Optional. Projected to the Claude command's UX. |
| `supportingSkills` | `{ id }[]`           | Optional. Firehorse-authored skill references.  |
| `upstreamSkills`   | `{ upstream, id }[]` | Optional. Structured upstream skill references. |

Required body sections, each as a `##` heading spelled exactly:

1. `## Purpose`
2. `## Usage`
3. `## Inputs`
4. `## Outputs`
5. `## Supporting Capabilities`
6. `## Orchestration Intent`
7. `## Safety Gates`
8. `## Procedure`
9. `## Projection Notes` — required to author, never shipped: the projector
   strips it, because the running agent is told by the generated notice that the
   file is generated.

Each workflow projects to one Claude command. `audience: user` — the default —
sends it to `packages/firehorse-claude/commands/firehorse/<id>.md`, where the
plugin ships it as `/firehorse:<id>`. `audience: maintainer` sends it to this
repo's own `.claude/commands/<id>.md`, invoked as `/<id>`; the `plugin:command`
colon namespace is reserved for plugins, so a maintainer command cannot carry
the `firehorse:` prefix.

## Skill definitions

A skill adds these fields:

| Field           | Type   | Notes                                            |
| --------------- | ------ | ------------------------------------------------ |
| `license`       | string | Optional Agent Skills metadata.                  |
| `compatibility` | string | Optional Agent Skills metadata, up to 500 chars. |

Required body sections:

1. `## Purpose`
2. `## Usage`
3. `## Inputs`
4. `## Outputs`
5. `## Instructions`
6. `## Boundaries`
7. `## Examples`
8. `## Projection Notes` — required to author, never shipped, as above.

Each skill projects to
`packages/firehorse-claude/skills/firehorse/<id>/SKILL.md`, whose `name`
frontmatter is the bare `<id>`. `audience: maintainer` sends it to
`.claude/skills/<id>/SKILL.md` instead.

Upstream skills are a different thing: Firehorse references them from a
workflow's `upstreamSkills` and leaves them in the plugin that ships them. They
are never normalized into this template.

## Frontmatter shape

The block below is a shape, not a checked-in definition. Replace every
placeholder.

```yaml
---
schemaVersion: 1
id: <slug>
kind: workflow
title: <Title>
description: <one-sentence provider-facing summary>
argumentHint: "[<what the user types after the command>]"
requires:
  tools:
    - read
    - bash
  environment:
    - filesystem
    - git
optional:
  orchestration:
    - subagents
upstreamSkills:
  - upstream: <plugin-name>
    id: <skill-name>
---
```

Omit `aliases`, `deprecated`, and `replacedBy` until a definition has actually
been renamed or deprecated.

## Cross-definition validation

`validateDefinitionSet` checks the set as a whole and reports:

- Two definitions claiming one ID.
- An `aliases` entry that collides with a live definition ID.
- A `replacedBy` target that does not exist.
- A `supportingSkills` reference that is missing, or that resolves to a
  definition whose `kind` is not `skill`.
- An `upstreamSkills` reference outside the known upstream skill set, when the
  caller supplies that set as `<upstream>:<id>` keys.

## Generated mirrors and manifests

```sh
pnpm definitions:write
pnpm definitions:check
```

`projectDefinitions(definitions, options)` takes a `ProjectionOptions`:
`repoRoot`, which makes the recorded source path relative, and
`upstreamResolutions`, the parsed `upstreams.lock.json`. Supplied, every
workflow mirror carries the resolved upstream-skill table; omitted, the mirror
falls back to the names the definition body already uses. `scripts/definitions.ts`
always supplies both, so the generated paths are identical on CI and locally.

`definitions:write` parses the canonical definitions, validates
cross-definition references, regenerates the Claude mirrors, updates the
manifest, and removes stale generated mirrors — but only those carrying valid
Firehorse provenance. It refuses to overwrite an unprovenanced target file.

`definitions:check` mutates nothing. It fails when a canonical definition is
invalid, when a generated file is missing, stale, or hand-edited, when the
manifest is stale, or when a stale generated mirror should have been removed.
`pnpm typecheck` runs it first, so the gate covers every typecheck.

Every generated mirror carries:

- Claude-native frontmatter.
- `firehorseGenerated: true`.
- `firehorseKind`, `firehorseId`, `firehorseSource`, `firehorseSourceSha256`,
  and `firehorseSchemaVersion`.
- A visible HTML `Generated by Firehorse. DO NOT EDIT.` comment naming the
  source path and its SHA-256.
- The instruction body, with two deliberate differences from the source:
  `## Projection Notes` is stripped, and `## Supporting Capabilities` gains a
  generated table resolving each `upstreamSkills` entry to its invocation and
  its `SKILL.md` path. Every other heading is preserved verbatim.

Only `audience: user` definitions reach the plugin manifest. A maintainer
definition is a full mirror with provenance; it lands under `.claude/` and stays
out of the shipped surface.

Projection also rewrites the `commands` and `skills` arrays of
`packages/firehorse-claude/.claude-plugin/plugin.json`. It replaces the entries
under `./commands/firehorse/` and `./skills/firehorse/` and leaves every other
entry alone, so hand-maintained commands and skills survive a regeneration.

## What the format leaves out

Deliberately out of scope:

- Firehorse runtime loading or execution.
- Prompt assembly beyond the static generated mirrors.
- Provider API transports.
- Slash-command or hook runtime behavior.
- Autonomous execution loops.
