---
schemaVersion: 1
id: index
kind: workflow
title: Index
description: Index the repo into codebase-memory-mcp and supermemory, write the derivable anchors under docs/codebase/, and record index freshness in the Firehorse manifest by commit ancestry.
argumentHint: "[--graph-only | --memory-only | --anchors-only]"
requires:
  tools:
    - mcp:codebase-memory-mcp
    - read
    - bash
    - write
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - ls
    - edit
    - cli:supermemory
  environment:
    - github
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: wayfinder
---

# Index

## Purpose

Use this workflow to make the repo's structure queryable and its history searchable, and to record how fresh that claim is. It adds what neither `codebase-memory-mcp` nor supermemory does on its own:

- Three **anchor** files derived from the graph rather than from recollection.
- A narrative source for them, taken from the repo's wayfinder maps.
- A **freshness** record computed from commit ancestry, so a later session can tell whether the index still describes HEAD.

Freshness is the point. An index nobody can date is an index every session has to distrust.

## Usage

Invoke the generated command with no arguments to run all three passes. `$ARGUMENTS` may carry `--graph-only`, `--memory-only`, or `--anchors-only` to run one. A partial run still records which passes succeeded.

## Inputs

- `$ARGUMENTS`: an optional pass selector.
- `git rev-parse HEAD`.
- The repo's source roots, and the existing `.firehorse/manifest.json`.
- The repo's `wayfinder:map` issues and their Decisions-so-far.
- `SUPERMEMORY_API_URL`, and whether `codebase-memory-mcp` is configured for this repo.

## Outputs

- A graph index for this repo, with coverage confirmed on the paths the anchors cite.
- Documents in supermemory for the anchors and the map decisions.
- `docs/codebase/ARCHITECTURE.md`, `docs/codebase/STRUCTURE.md`, and `docs/codebase/CONVENTIONS.md`.
- `.firehorse/manifest.json` updated with `index.commit`, `index.at`, `index.graph`, `index.supermemory`, `anchors.codebase`, and `anchors.design`.
- The other `anchors` booleans `/firehorse:new-project` wrote — `context`, `agents`, `adr` — left as they are unless the path they describe has appeared or gone.

## Supporting Capabilities

- `wayfinder` supplies the narrative pass — its maps hold the decisions that explain why the structure is as it is. It is user-invoked only; this workflow reads the maps it produced rather than invoking it at all.
- `codebase-memory-mcp` is required: the anchors are derived from graph output, and an anchor written without it is recollection rather than a reading of the code. The `supermemory` CLI stays optional. Either one absent is recorded as `false`, never silently skipped.
- **Graph reference:** the `codebase-memory` skill carries the `search_graph` and `query_graph` syntax, the edge-type vocabulary, and the multi-hop examples. `codebase-memory-mcp` installs it, so it is present wherever the server is — invoke it when you need the query form rather than guessing one. This workflow says when to query, not how.

## Orchestration Intent

Three passes, each recorded independently: graph, memory, anchors. A half-finished index stays legible because `index.graph` and `index.supermemory` say which pass actually succeeded. The narrative pass reads wayfinder maps and writes nothing back — this workflow creates no ticket, closes none, and edits no map.

## Safety Gates

- **`DESIGN.md` is a human statement of direction.** This workflow records whether it exists; inferring it from the components that happen to exist describes what the UI is, not what it should be.
- **Staleness comes from commit ancestry.** See [Freshness rule](#freshness-rule).
- **`true` means the pass succeeded.** `index.graph` and `index.supermemory` record what actually happened.
- **Every anchor claim traces to a graph query or a file you opened**, and `check_index_coverage` confirms each path it cites.
- **Wayfinder maps and their tickets are read-only here.**
- **The manifest is committed**, so it carries no secret and no id.

## Freshness rule

A reader of the manifest applies this, so the report states it:

- `index.commit` equal to HEAD → the index is current.
- Otherwise `git merge-base --is-ancestor <index.commit> HEAD` plus `git rev-list --count <index.commit>..HEAD` gives how far behind it is.
- Not an ancestor → the index was recorded on a different line of history.

## Gotchas

- File modification times say which tool touched a file last and nothing about whether content changed. They are not a staleness signal.
- `index_repository` returning without error is not the same as a completed index. `index_status` is the confirmation.
- `npx supermemory add` returns `queued` in milliseconds, and a misconfigured extraction model produces nothing while still reporting success.
- `index.commit` and the anchors it describes belong in one commit, or the manifest dates content that was not yet written.

## Procedure

1. **Record the commit.** `git rev-parse HEAD`, first. Every later field refers to this value, not to HEAD at the time you finish.
   → Done when: the SHA is written down.

2. **Graph pass.** `index_repository` for this repo, `index_status` to confirm it completed, then `check_index_coverage` on each source root.
   → Done when: `index.graph` is decided as `true` or `false`, and a `false` names what failed.

3. **Narrative pass.** `gh issue list --label wayfinder:map --json number,title`, then read each map's Decisions-so-far and fetch the resolution comment of any closed ticket whose decision bears on the structure.
   → Done when: the decisions the anchors will cite are collected. The graph supplies the shape; these supply the reasons.

4. **Write the anchors** under `docs/codebase/`, each from `get_architecture`, `search_graph`, and `query_graph` output plus step 3's decisions:
   - `ARCHITECTURE.md` — the modules, their boundaries, and the decision that put each boundary there.
   - `STRUCTURE.md` — the directory layout and what each directory is for.
   - `CONVENTIONS.md` — the patterns the code actually follows, each with a cited example path.

   Keep them at the altitude a newcomer needs: the boundaries, what each one is for, and why it is where it is. Per-symbol detail belongs to the graph, which answers it exactly and stays current; an anchor that restates it goes stale the first time someone renames a function.

   → Done when: all three files exist, every path they cite passed `check_index_coverage`, and nothing in them repeats what a graph query answers better.

5. **Memory pass.** `npx supermemory add` for each anchor you wrote and each map decision you read, so a later `npx supermemory search` can reach it. `SUPERMEMORY_API_URL` unset and the supermemory plugin absent → set `index.supermemory: false`, say so in one line, and carry on.
   → Done when: `index.supermemory` is decided, and each `add` was confirmed with `npx supermemory docs get <id>`.

6. **Update `.firehorse/manifest.json`:** `index.commit` from step 1, `index.at` as an ISO timestamp, `index.graph` and `index.supermemory` from the passes, `anchors.codebase` as the basenames written under `docs/codebase/`, and `anchors.design` as whether `DESIGN.md` exists. `/firehorse:map` reads these fields rather than probing, so a field left stale is a dead pointer in every later session's Notes block.
   → Done when: every one of those six fields is set, and `anchors.context`, `anchors.agents`, and `anchors.adr` still match what is on disk.

7. **Commit anchors and manifest together.**
   → Done when: one commit carries both, and its parent is the SHA from step 1.

8. **Report each pass** as succeeded or failed, the anchors written, the manifest fields set, and the [freshness rule](#freshness-rule) a reader should apply.
   → Done when: the report names all three passes explicitly, including any that did not run.

## Projection Notes

The graph tools reach Claude through the `codebase-memory-mcp` MCP server and supermemory through its CLI; this definition adds no transport of its own.
