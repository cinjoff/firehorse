# What Firehorse implements, and what it does not

Concept by concept against the shipped surface. Verified on 2026-09-20 against
`packages/firehorse-core/definitions/`, `packages/firehorse-claude/`, and
`.firehorse/manifest.json` in the `outgoing-painter` worktree, not inferred from
the docs, several of which are stale.

Firehorse ships nine definitions: eight workflows and one skill. Six workflows
project to user commands; `ship` and `upstreams-check` are maintainer-only per
D-152.

## The mapping

| Concept | Firehorse's answer | State |
|---|---|---|
| Communication gap | `grilling`, invoked by `map` and `new-project` | Works |
| Map and fog of war | `map`, wrapping `wayfinder` and adding the Notes block | Works |
| One ticket per session | `wayfinder`'s rule, carried through `map` | Works |
| Smart zone | The same rule, plus splitting planning across sessions | Works |
| Ubiquitous language | `domain-modeling` on grilling tickets; `CONTEXT.md` | Works |
| Deep modules | `codebase-design`, invoked by `build` | Works |
| Momento-driven development | `index`, writing `docs/codebase/` anchors and memory | Graph half works, memory half broken here |
| Tracer bullets, vertical slices | `build`, implementing test-first | Works, subject to #226 |
| Automated review | `code-review`, inside `build` and `ship` | Works, undeclared in `build` frontmatter |
| Spec then tickets | Nothing | Missing, #222 |
| Gardening, entropy | Nothing shipped | Missing |
| Observability over agents | Nothing shipped | Missing, #211 owns it |
| Ralph loops | Nothing, and nothing needed | Out of scope |
| Day shift, night shift | Nothing. A working style, not a workflow | Out of scope |

## The gaps, in the order they cost you

### The memory half of `index` reports success it did not earn
The manifest records `index.supermemory: true`. In the run that set it, the graph
half completed cleanly while the documents queued for the memory store all failed
within hours. Searches kept returning results, which masked it, because the hits
came from captured session turns rather than the written anchors. The flag was set
by explicit instruction after the agent declined to claim the pass, so the field
records an intent rather than a measurement.

This matters beyond one field: the `map` workflow gates a whole Notes paragraph on
it, so every map charted since inherits a recall instruction pointing at anchors
that are not there. Filed on [#220](https://github.com/cinjoff/firehorse/issues/220).

### `build` and `fix-bug` require a graph this repo cannot query
Both declare `mcp:codebase-memory-mcp` under `requires` and open by querying the
graph for the affected seam. `index.graph` is `false` here and the indexed project
points at a different worktree, so the first step of each has nothing to read.
[#117](https://github.com/cinjoff/firehorse/issues/117) owns it.

### No path from an idea to tickets
A map produces decisions. `build` expects a ticket. Nothing spans the gap.
Upstream `to-spec`, `to-tickets`, and `triage` are installed and unused, and the
five triage labels `new-project` creates are read by nothing Firehorse ships. This
is the largest structural gap against the source, which treats spec-to-tickets as
the ordinary path. [#222](https://github.com/cinjoff/firehorse/issues/222).

### Two dead skill pointers
`research` is instructed in the `map` body and undeclared in its frontmatter;
`code-review` is invoked in the `build` body and undeclared in its frontmatter.
Both are invisible to `pnpm upstreams:check`. The `map` body also names
`code-review` in a list it says comes from the resolved-skills table, which for
`map` cannot contain it, so the rule contradicts itself.

### `firehorse-recall` is orphaned
Its only mention in any workflow says it is a different path. Nothing reads back
what `index` writes, and `map` reimplements recall as prose instead of calling the
skill.

### The gardening loop is missing
The source runs an architecture-improvement skill every morning and turns the
proposal into tickets. `improve-codebase-architecture` is installed upstream and
Firehorse never calls it. Worth treating as an evaluation candidate rather than an
addition, since a daily proposal against a repo this size manufactures review work.

## Where the source would criticise this repo

**It encodes one side of the TDD question.** `build` wraps `tdd` and implements
test-first, which is the recommendation without the doubt. The rule that survives
the source's own disagreement is proof rather than tests.
[#226](https://github.com/cinjoff/firehorse/issues/226).

**Nothing measures whether any of it works.** The source's first organisational
step is observability over agents plus someone reading the data.
`docs/EVALUATION-FRAMEWORK.md` states there is no harness, no fixtures, and no
session reader, and its gate covers inbound candidates rather than the shipped
surface. [#211](https://github.com/cinjoff/firehorse/issues/211).

**A leading word only works if it reaches the agent.** The vocabulary these notes
recommend lives in workflow bodies and `CONTEXT.md`. `CONTEXT.md` still describes
Firehorse as cross-provider, which `docs/agents/domain.md` routes every upstream
skill to read. Stale anchors are the failure mode for this technique, and
[#113](https://github.com/cinjoff/firehorse/issues/113) owns the cleanup.
