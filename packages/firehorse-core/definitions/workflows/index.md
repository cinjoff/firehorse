---
schemaVersion: 1
id: index
kind: workflow
title: Index
description: Index the repo into codebase-memory-mcp and claude-mem, write the derivable anchors under docs/codebase/, and record index freshness in the Firehorse manifest by commit ancestry.
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
    - mcp:claude-mem
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

Use this workflow to make the repo's structure queryable and its history searchable, and to record how fresh that claim is. It adds what neither `codebase-memory-mcp` nor claude-mem does on its own:

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
- Whether the claude-mem worker answers, and whether `codebase-memory-mcp` is configured for this repo.

## Outputs

- A graph index for this repo, with coverage confirmed on the paths the anchors cite.
- One claude-mem observation per anchor written and per map decision read.
- `docs/codebase/ARCHITECTURE.md`, `docs/codebase/STRUCTURE.md`, and `docs/codebase/CONVENTIONS.md`.
- `.firehorse/manifest.json` updated with `index.commit`, `index.at`, `index.graph`, `index.memory`, `anchors.codebase`, and `anchors.design`.
- The other `anchors` booleans `/firehorse:new-project` wrote — `context`, `agents`, `adr` — left as they are unless the path they describe has appeared or gone.

## Supporting Capabilities

- `wayfinder` supplies the narrative pass — its maps hold the decisions that explain why the structure is as it is. It is user-invoked only; this workflow reads the maps it produced rather than invoking it at all.
- `codebase-memory-mcp` is required: the anchors are derived from graph output, and an anchor written without it is recollection rather than a reading of the code. claude-mem stays optional. The graph pass absent is recorded as `graph: false`; the memory pass absent is recorded by leaving `index.memory` out. Neither is silently skipped.
- **Graph reference:** the `codebase-memory` skill carries the `search_graph` and `query_graph` syntax, the edge-type vocabulary, and the multi-hop examples. `codebase-memory-mcp` installs it, so it is present wherever the server is — invoke it when you need the query form rather than guessing one. This workflow says when to query, not how.

## Orchestration Intent

Three passes, each recorded independently: graph, memory, anchors. A half-finished index stays legible because `index.graph` and `index.memory` say which pass actually succeeded. The narrative pass reads wayfinder maps and writes nothing back — this workflow creates no ticket, closes none, and edits no map.

## Safety Gates

- **`DESIGN.md` is a human statement of direction.** This workflow records whether it exists; inferring it from the components that happen to exist describes what the UI is, not what it should be.
- **Staleness comes from commit ancestry.** See [Freshness rule](#freshness-rule).
- **A recorded pass is one you read back.** `index.graph` and `index.memory` record what actually happened, and `index.memory` carries the count it wrote rather than a boolean, so it cannot be set from optimism alone.
- **Every anchor claim traces to a graph query or a file you opened**, and `check_index_coverage` confirms each path it cites.
- **An anchor comes from structure, not from a body.** Where claude-mem's file read gate answers a `Read` with its ladder, prefer `smart_outline` and stop there: what the outline cannot carry is not a derivable anchor. Where the gate does not fire, hold to the same limit.
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
- A save returns before the store has indexed it, so the write is reported from a read-back rather than from the response to the write.
- `index.commit` and the anchors it describes belong in one commit, or the manifest dates content that was not yet written.

## Procedure

1. **Record the commit.** `git rev-parse HEAD`, first. Every later field refers to this value, not to HEAD at the time you finish.
   → Done when: the SHA is written down.

2. **Graph pass.** `index_repository` for this repo, `index_status` to confirm it completed, then `check_index_coverage` on each source root.
   → Done when: `index.graph` is decided as `true` or `false`, and a `false` names what failed.

3. **Narrative pass.** List the `wayfinder:map` tickets the way `docs/agents/issue-tracker.md` records — `gh issue list --label wayfinder:map --json number,title` where the tracker is GitHub — then read each map's Decisions-so-far and fetch the resolution comment of any closed ticket whose decision bears on the structure.
   → Done when: the decisions the anchors will cite are collected. The graph supplies the shape; these supply the reasons.

4. **Write the anchors** under `docs/codebase/`, each from `get_architecture`, `search_graph`, and `query_graph` output plus step 3's decisions:
   - `ARCHITECTURE.md` — the modules, their boundaries, and the decision that put each boundary there.
   - `STRUCTURE.md` — the directory layout and what each directory is for.
   - `CONVENTIONS.md` — the patterns the code actually follows, each with a cited example path.

   Keep them at the altitude a newcomer needs: the boundaries, what each one is for, and why it is where it is. Per-symbol detail belongs to the graph, which answers it exactly and stays current; an anchor that restates it goes stale the first time someone renames a function.

   → Done when: all three files exist, every path they cite passed `check_index_coverage`, and nothing in them repeats what a graph query answers better.

5. **Memory pass.** `POST /api/memory/save` on the claude-mem worker for each anchor you wrote and each map decision you read, so a later `search` can reach it. The worker's port is `CLAUDE_MEM_WORKER_PORT` in `~/.claude-mem/settings.json`, defaulting to `37700 + (uid % 100)`; pass `"project"` explicitly so a run from a worktree lands on the repo's own history. The worker unreachable → leave `index.memory` out, say so in one line, and carry on.
   → Done when: every save has been read back with `search`, and the count you read back is the number you are about to record.

6. **Update `.firehorse/manifest.json`:** `index.commit` from step 1, `index.at` as an ISO timestamp, `index.graph` from the graph pass and `index.memory` from the memory pass (`engine`, the `observations` count you read back, and `at`), `anchors.codebase` as the basenames written under `docs/codebase/`, and `anchors.design` as whether `DESIGN.md` exists. `/firehorse:map` reads these fields rather than probing, so a field left stale is a dead pointer in every later session's Notes block.
   → Done when: every one of those six fields is set, and `anchors.context`, `anchors.agents`, and `anchors.adr` still match what is on disk.

7. **Commit anchors and manifest together.**
   → Done when: one commit carries both, and its parent is the SHA from step 1.

8. **Report each pass** as succeeded or failed, the anchors written, the manifest fields set, and the [freshness rule](#freshness-rule) a reader should apply.
   → Done when: the report names all three passes explicitly, including any that did not run.

## Handoff

Close the run with this block, after the step-8 report and with nothing following it.

````
───────────────────────────────────────────────
## ▶ Next · <repo name>

**Chart the map** · the graph and anchors describe <commit>

/clear then:

/firehorse:map
───────────────────────────────────────────────
````

- **Skip the block entirely when `/firehorse:new-project` called this run** at its step 6. That workflow carries its own handoff, and two in a row is noise.
- **Clear first.** Indexing fills a session with graph output and anchor drafts that the map session has no use for. The manifest fields from step 6 are the handoff; the transcript is not.
- **A failed pass changes the recommendation.** Where the graph pass failed, offer the fix rather than the map: a map charted against a missing index sends every later session to a dead pointer.
- **Advisory voice.** The block offers a command. It never says the user must run it, and this workflow never runs it.

## Projection Notes

The graph tools reach Claude through the `codebase-memory-mcp` MCP server and claude-mem through its own plugin's MCP server and loopback worker; this definition adds no transport of its own.
