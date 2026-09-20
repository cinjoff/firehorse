---
schemaVersion: 1
id: build
kind: workflow
title: Build
description: Build a ticket by querying the codebase graph for the affected seam first, prototyping when the UI shape is uncertain, then implementing test-first and reporting verification evidence.
argumentHint: "[issue URL or number | spec path]"
requires:
  tools:
    - mcp:codebase-memory-mcp
    - read
    - bash
    - edit
    - write
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - find
    - ls
  orchestration:
    - subagents
    - review-gates
  modalities:
    - vision
  environment:
    - github
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: implement
  - upstream: mattpocock-skills
    id: tdd
  - upstream: mattpocock-skills
    id: prototype
  - upstream: mattpocock-skills
    id: codebase-design
  - upstream: impeccable
    id: impeccable
---

# Build

## Purpose

Use this workflow to take one ticket from the tracker to a committed, verified change. It adds three things `implement` and `tdd` do not do on their own:

- The **seam** — the public boundary under change — is established from the codebase graph, in writing, before you open a file.
- An uncertain **shape** — what the UI should look like, whether a state model feels right — goes through a prototype before any production code exists.
- The report carries **evidence**: commands and their output, including a proof that fails without the change, not a claim that the work is done.

`tdd` refuses to write a test at an unconfirmed seam. This workflow is how the seam gets confirmed: from `search_graph` and `trace_path`, in writing, before the first test.

## Usage

Invoke the generated command with a ticket reference — whatever this repo's tracker uses, an issue URL or number where that tracker is GitHub — or a spec. `$ARGUMENTS` carries it. One slice per invocation: a spec that has been sliced is read for its frontier and handed back, never built whole.

## Inputs

- `$ARGUMENTS`: the issue reference or spec path.
- The ticket's body, labels, and comments, read with the verb `docs/agents/issue-tracker.md` records for it.
- `docs/agents/issue-tracker.md` — which tracker this repo uses and the verbs that reach it. Every tracker action below goes through what it records. Absent → say so and ask, rather than assuming GitHub.
- The codebase graph for this repo, through `codebase-memory-mcp`.
- `CONTEXT.md` for the repo's vocabulary, and `DESIGN.md` when the change has a UI surface.

## Outputs

- A seam list: the public boundary under change and its call sites, each with the graph query that produced it.
- A prototype linked from the issue, when the shape was the open question.
- Small, reviewable commits on the current branch.
- A verification block on the issue: every command run, its output, the proof's `Before` and `After`, and what you did not verify.

## Supporting Capabilities

- `implement` drives the build loop, `tdd` the red-green loop at the confirmed seams, `prototype` the shape branch, and `codebase-design` when the seam's depth is itself in question. The table below says which of them you can invoke and which you read.
- `impeccable` critiques a UI surface against the direction `DESIGN.md` states.
- `codebase-memory-mcp` is required: step 2 is a graph query, and grep over a repo this workflow has not read is not a substitute. Absent, say so in the first line of the report, fall back to grep, and treat every seam in the list as unconfirmed until the user confirms it by hand.
- **Graph reference:** the `codebase-memory` skill carries the `search_graph` and `query_graph` syntax, the edge-type vocabulary, and the multi-hop examples. `codebase-memory-mcp` installs it, so it is present wherever the server is — invoke it when you need the query form rather than guessing one. This workflow says when to query, not how.

## Orchestration Intent

You drive the sequence; `implement` and `tdd` run inline. `prototype` produces a throwaway artifact linked from the issue, never production code. Where the repo supports subagents, run the `mattpocock-skills:code-review` pass as a subagent so its context stays clean — `/firehorse:ship` runs that review again before the PR.

## Safety Gates

- **Structure first, files second.** The seam list from step 3 exists before you open a source file.
- **Confirmed seams only.** `tdd` runs at the seams the user confirmed in step 3, and nowhere else.
- **Shape before pixels.** While "what should this look like" is still open, the artifact is a prototype.
- **A spec is not a slice.** Build one only where it names a single behaviour at a single confirmed seam. A spec with published children is read for its frontier and handed back, because building a whole feature in one session is what the slices exist to prevent.
- **Cite only what you opened.** `check_index_coverage` confirms every path the graph returns before you quote it.
- **Evidence closes work, claims do not.** The gate output and the proof go on the issue; a red gate, or a proof that passes as readily without the change, is the result of the run.
- **Planning lives in the tracker** — issues and their comments, the way the tracker doc records them, never a markdown draft committed beside the code.
- **Generated files come from their generator.** Where this repo generates a file from a source of truth, edit the source and re-run the generator; a hand-edit to the output is lost at the next run.

## Gotchas

- A stale graph answers confidently. `index_status` behind HEAD means the seam list describes an older tree — run `/firehorse:index`, or state the gap in the report.
- `check_index_coverage` is best-effort. It confirms a path was indexed; it never proves the trace found every caller, so a negative result is "not found", never "does not exist".
- `DESIGN.md` states intended direction. A critique of the current pixels cannot supply it, so `impeccable` reads it first or it critiques against nothing.

## Procedure

1. **Read the ticket** through the tracker `docs/agents/issue-tracker.md` records — `gh issue view <number> --comments` where that is GitHub. Name the behaviour that must change. A ticket that reaches a map, directly as a wayfinder child or through the spec it was cut from, also means loading that map's `## Notes` and obeying what it says; a slice that carries its own gate command already has the part that matters.

   Given a spec rather than a slice, read its children first and branch on what you find: children already published means this run builds nothing, and instead reports the frontier and names the slice to start with. No children and one behaviour at one confirmed seam means build it. No children and anything wider means route to `/firehorse:tickets` and stop.
   → Done when: the behaviour under change is written in one sentence, or the run has reported a frontier and stopped.

2. **Query the graph.** The graph is how you learn this codebase's architecture and the impact of the change before touching it. For every symbol the ticket names, `search_graph`; for each hit, `trace_path` for its callers; `get_architecture` when the ticket crosses modules. Then `index_status` for freshness and `check_index_coverage` on every path you intend to cite.
   → Done when: every named symbol has a trace, and the index's freshness is recorded.

3. **Confirm the seam list.** Write the public boundary you will change, every call site the trace found, and the query that found each one. When the seam's shape is itself the question — how deep the module should be, where the boundary belongs — consult `mattpocock-skills:codebase-design` before asking.
   → Done when: the user has confirmed the list. `tdd` starts only after that confirmation.

4. **Decide the shape branch.** UI surface with "what should it look like" or "does this state model feel right" still open → invoke `mattpocock-skills:prototype`, link the artifact from the issue, and get a reaction before any production code. Shape settled → skip, and say so in one line.
   → Done when: the branch is taken or declined, in writing.

5. **Critique the UI surface.** For a UI change, read `DESIGN.md`, then run `impeccable:impeccable` against it.
   → Done when: `impeccable`'s findings are addressed or recorded. No UI surface, skip.

6. **Implement.** `mattpocock-skills:implement` is user-invoked only, so read its `SKILL.md` at the path in [Supporting Capabilities](#supporting-capabilities) and follow its loop yourself; invoke `mattpocock-skills:tdd` at the step-3 seams.
   → Done when: the behaviour from step 1 is in place and its tests pass.

7. **Run the gate, then the proof.** Derive the gate from this repo rather than assuming one: the typecheck, test and check scripts its manifest declares — `package.json` `scripts` for a Node repo — run through the package manager its lockfile names, unless the ticket carries its own gate command, which wins. No gate script, no gate: say so in one line.

   Then run the ticket's `## Proof` command. A green gate says the repo is not broken, and it was green before this slice existed; the proof is the only thing that says this slice's behaviour is now there. Keep both outputs verbatim. A ticket with no Proof block gets the gate alone and one line saying so, because a proof written after the change is a description of what you just did.
   → Done when: every gate is green and the proof command prints the `After` the ticket named, or a red gate or a proof that did not move is recorded and the run stops here.

8. **Commit.** Small, reviewable commits on the current branch.
   → Done when: the working tree is clean.

9. **Report on the ticket.** Comment with the seam list, the prototype link when there was one, the gate commands with their output, the proof command with its `Before` and `After`, and what you did not verify. Leave the issue open for `/firehorse:ship` to close.
   → Done when: the comment is posted and the issue is still open.

## Handoff

Close the run with this block, after the step-9 report and with nothing following it.

````
───────────────────────────────────────────────
## ▶ Next · <repo name>

**Ship #<ticket>** · open the PR, merge it, cut the release, close the issue

/firehorse:ship

**Also available:**
- `/clear` then `/firehorse:build <n>` · the next unblocked slice, read from the spec's children
- `/firehorse:build <n>` · another slice onto this branch first, no clear
───────────────────────────────────────────────
````

- **No `/clear` here.** `/firehorse:ship` reviews the diff this session just produced and re-runs the same gate. The seam list from step 3 and the gate output from step 7 are still worth having, so clearing costs more than it saves.
- **A red gate ends the run at step 7,** and the block goes with it. Name the gate that failed and the command that reproduces it; offer no next workflow until it is green.
- **Advisory voice.** The block offers a command. It never says the user must run it, and this workflow never runs it.

## Projection Notes

Upstream skills are referenced, not inlined, so a changed upstream needs no rewrite here — `/firehorse:upstreams-check` reports when one moves.
