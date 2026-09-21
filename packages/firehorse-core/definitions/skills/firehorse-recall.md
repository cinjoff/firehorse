---
schemaVersion: 1
id: firehorse-recall
kind: skill
title: Firehorse recall
description: Search claude-mem for what past sessions decided, tried, or ruled out, and write a durable note when this session settles something. Use it when a decision is about to be relitigated ("why is it done this way?"), when a convention or preference should exist but is not in the repo, when work resumes after a gap and the open threads are not in the diff, or when this session hit a trap the next one would rediscover. Invoke it on one of those triggers or on request, never as a session-start reflex.
compatibility: Requires the claude-mem plugin installed from the thedotmack marketplace, with its worker answering on loopback and its MCP search tools registered. Reads and writes both go to the local worker; neither needs an API key.
---

# Firehorse recall

## Purpose

Use this skill to reach memory on purpose. claude-mem's hooks already capture
every session and inject a costed index at session start; this skill is the
other half — the deliberate query you run when you suspect a question has been
answered before, and the deliberate note you write when this session answers one.

It is not a search ladder. claude-mem ships the tools and ships `mem-search`,
which documents how to spend a token budget across them (D-185). This skill
carries only what upstream has no reason to know: when this repo reaches for
memory, how much weight to give what comes back, and how to write something down.

## Usage

Invoke by name or intent: "recall what we decided about X", "search memory for
Y", "remember that Z". Automatic recall is the hooks' job; running both spends
context twice on the same store.

For the search tools' own syntax and cost model, read claude-mem's `mem-search`
skill rather than a copy of it here. It comes from the installed version, so it
cannot drift from the tools it describes.

## Inputs

- The question, in the user's words — keep their nouns; they are what past
  sessions indexed.
- The project key. Reads may span `firehorse` and this worktree's own
  `firehorse/<worktree dir>`; deliberate writes use `firehorse` (see Gotchas).
- A reachable claude-mem worker. Its port is `CLAUDE_MEM_WORKER_PORT` in
  `~/.claude-mem/settings.json`, defaulting to `37700 + (uid % 100)`.
- For a write: the one thing worth persisting, stated as a fact.

## Outputs

- A short brief: the observations that bear on the question, each with its age
  and its id, and a plain line when memory has nothing.
- On a write, the id the worker returned, and what a read-back of it says.

## Instructions

### Ask the index before you ask for detail

Start with `search`, scoped to the project and — when the question has a shape —
to an observation type. `decision`, `gotcha` and `trade-off` are the three that
answer "why is it done this way?"; the others are `bugfix`, `feature`,
`discovery`, `refactor` and `change`.

```
search(query="<the user's nouns>", project="firehorse", type="decision", limit=10)
```

→ Done when: the question is answered from the titles, or the titles say it
cannot be.

Escalate only for the hits you actually chose. `get_observations` takes a batch
and costs roughly ten times what an index row costs, so call it once with every
id you want rather than once per id. Reach for `timeline` when the narrative
around a hit is the thing you need, and for `get_tool_uses` only when a summary
demonstrably is not evidence enough.

### Widen an empty search before concluding memory is empty

The query is SQLite FTS5, so widening is a syntax move rather than a flag:
drop to a single noun, use `OR` between the candidates, drop the `type` filter,
or drop `project` to find out whether the memory lives under another one.

Widening twice with nothing back is an answer. Report it.

### Write the durable fact

Deliberate notes go to the worker's save endpoint, which takes the project
explicitly. Pass the repository name rather than the worktree key: a fact worth
persisting belongs to the repo, not to whichever worktree happened to be open,
and worktree directory names here are generated word pairs that mean nothing to
a later reader.

```sh
PORT=$(jq -r '.CLAUDE_MEM_WORKER_PORT // empty' ~/.claude-mem/settings.json)
curl -sS -X POST "http://127.0.0.1:$PORT/api/memory/save" \
  -H 'Content-Type: application/json' \
  -d '{"text":"<the fact>","title":"<short title>","project":"firehorse"}'
```

Report what the response says, not that you sent it.

### Report with age attached

A decision from three days ago and one from eight months ago carry different
weight. A brief that hides the difference makes the reader trust both equally.
The session-start index already prints the current date for exactly this reason.

## Gotchas

- **A worktree reads the repo's history but writes its own.** claude-mem keys a
  worktree session `<repo>/<worktree dir>`, so writes from here land under
  `firehorse/<worktree dir>`, while the hooks inject across both that and
  `firehorse`. Searching without a `project` filter is therefore wider than it
  looks, and searching with `project="firehorse"` misses this worktree's own
  observations. Ask for both when the answer could be in either.
- **An observation records what was true when it was written.** The repo is the
  authority on what is true now.
- **Extraction is a compression step and compresses wrongly sometimes.** A past
  capture in this store claimed the repo used Turborepo, which it does not.
  Treat a surprising memory as a lead, not a finding.
- **The worker API has no request authentication.** Its loopback bind is the
  only thing in front of it, which is a reason to keep reads and writes local
  and never to forward the port.

## Boundaries

- **Explicit invocation only** — on a trigger from the description, or on
  request. Session-start reflex recall is the hooks' job, and they have already
  done it.
- **The repo wins a disagreement with memory**, and the disagreement is worth
  saying out loud.
- **Index first, detail second.** Full observations go to the hits you chose.
- **Memory holds what the repo does not.** A decision already in
  `docs/DECISIONS.md` or on a wayfinder map has a home, and memory is not it.
- **Memories are facts**, not artifacts: no secrets, no tokens, no file
  contents, no transcripts. Wrap anything that must not be captured at all in
  `<private>` tags.
- **A write is reported from what the worker returned**, never from having sent
  it.
- **The ladder's syntax belongs to `mem-search`.** Do not restate it here; a
  second copy drifts from the tools on the day it is written.

## Examples

Recall before relitigating a decision:

```
search(query="postgres sqlite", project="firehorse", type="decision", limit=10)
get_observations(ids=[2543, 2102])
```

Report: `[~2mo, #2543] Chose Postgres for the concurrent-writer story; SQLite was
rejected on WAL contention, not on size.`

Widen a query that came back empty:

```
search(query="rollback OR deploy OR revert", project="firehorse", limit=10)
```

Persist what this session settled:

```sh
curl -sS -X POST "http://127.0.0.1:$PORT/api/memory/save" \
  -H 'Content-Type: application/json' \
  -d '{"text":"claude-mem keys a worktree session <repo>/<worktree dir> for writes, and injects across both that and <repo> for reads.","title":"claude-mem worktree scoping","project":"firehorse"}'
```

## Projection Notes

The mirror must also be listed in the plugin manifest's `skills` array — the
manifest is the authority on which skills exist, and one on disk but unlisted is
one Claude never loads.

claude-mem ships `mem-search` and 19 other skills through the `thedotmack`
marketplace, which Firehorse declares as a dependency. That is why this skill
can defer the search syntax to an installed sibling rather than carrying it:
unlike supermemory's skills repositories, claude-mem publishes a marketplace
manifest, so the dependency resolves.
