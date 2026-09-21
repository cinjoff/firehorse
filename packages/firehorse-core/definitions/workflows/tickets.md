---
schemaVersion: 1
id: tickets
kind: workflow
title: Tickets
description: Cut a spec into tracer-bullet tickets — vertical slices sized to one session, wired with the tracker's blocking edges, each naming its seam, and triaged so a label means an agent can start.
argumentHint: "[spec issue URL or number | spec path]"
requires:
  tools:
    - read
    - bash
  environment:
    - filesystem
    - git
optional:
  tools:
    - grep
    - ls
    - write
    - edit
    - mcp:codebase-memory-mcp
  environment:
    - github
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: to-tickets
  - upstream: mattpocock-skills
    id: triage
  - upstream: mattpocock-skills
    id: codebase-design
---

# Tickets

## Purpose

Use this workflow to turn a spec into the work `/firehorse:build` consumes. It is the second half of the hand-off `wayfinder` names when it says the pull to do the work means you have reached the edge of the map.

It adds three things to `to-tickets`:

- **Each slice names its seam**, from the graph, so `/firehorse:build` opens on a boundary that has already been confirmed once rather than re-deriving it per ticket.
- **The chain stays in the tracker.** Slices link the spec, the spec links the map, so a ticket three weeks later still reaches the decision that produced it.
- **Triage runs on what this produced.** The label vocabulary `/firehorse:new-project` created is applied here, which is the only thing that makes `ready-for-agent` mean anything.

A slice is vertical: a narrow path through every layer that is demoable on its own. A ticket that delivers one layer is not a slice, it is a phase.

## Usage

Invoke the generated command with the spec: an issue URL or number where the spec was published to the tracker, or a path where this repo keeps specs as files. `$ARGUMENTS` carries it. With no argument, work from the spec this session already has in context, and say so in the first line.

## Inputs

- `$ARGUMENTS`: the spec reference.
- The spec's full body and comments, especially Implementation Decisions, Testing Decisions, and Out of Scope.
- The map the spec links, for the standing preferences in its `## Notes`.
- `docs/agents/issue-tracker.md` — which tracker this repo uses, the verbs that reach it, and how it expresses blocking. Absent → say so and ask, rather than assuming GitHub.
- `docs/agents/triage-labels.md` — the five canonical roles and what each one means here.
- The codebase graph, through `codebase-memory-mcp`: the seams the spec names, and the blast radius of anything mechanical, with `query_graph` where the fan-out crosses more than one hop.
- `CONTEXT.md` for the vocabulary the ticket titles use.

## Outputs

- One issue per slice, published in dependency order, each with its blocking edges expressed the way this tracker expresses them.
- A seam line on every slice: the boundary it changes, and the query that found it.
- The gate command from the map's `## Notes` on every slice, so the build session runs the gate this effort settled on instead of one derived from the manifest.
- A `## Proof` block on every slice: the end state, the command that shows it, how that command fails today, and what it prints once the slice lands.
- A triage label on every slice, and an agent brief on the ones labelled `ready-for-agent`.
- The frontier named in the report: the slices whose blockers are all closed.

## Supporting Capabilities

- `to-tickets` owns the slicing rules, the blocking edges, the quiz, and the publish order, including the expand-contract sequence a wide refactor needs. It is user-invoked only, so read its `SKILL.md` at the path in the resolved table and follow it rather than invoking it.
- `triage` owns the label semantics and the agent brief. Also user-invoked only, and read the same way.
- `codebase-design` is for a slice whose seam does not exist yet: a new boundary proposed at the highest point it can sit.
- `codebase-memory-mcp` is optional and load-bearing when present. Without it, the blast radius of a wide refactor is a guess, and the run says so.
- **Graph reference:** the `codebase-memory` skill carries the `search_graph` and `query_graph` syntax, the edge-type vocabulary, and the multi-hop examples. `codebase-memory-mcp` installs it, so it is present wherever the server is — invoke it when you need the query form rather than guessing one. This workflow says when to query, not how.

## Orchestration Intent

You drive the sequence; `to-tickets` supplies the shape and `triage` the labels. The quiz in step 4 is human in the loop by design and it is not optional: an agent that approves its own breakdown has skipped the only review this artifact gets before a session starts building from it.

## Safety Gates

- **The user approves the breakdown before anything is published.** No exceptions, including a breakdown the user has seen a version of before.
- **AFK or HITL on every slice.** A slice needing human judgement, credentials, or a design call is HITL and never carries `ready-for-agent`.
- **An unconfirmed or proposed seam makes the slice human-first.** It carries the seam, the query or the design call that would settle it, and the label its human role maps to, with establishing the seam as that session's first step. The slice is not blocked from existing, only from being handed to an agent.
- **`ready-for-agent` means a fresh session can start from the body alone.** A body that assumes this conversation fails the bar, and that is the commonest way a slice fails it.
- **The parent is read, never written.** This workflow adds children to the spec and says what they are; the spec and the map come out of the run in the state they went in.
- **A spec that already has slices is not re-sliced silently.** Where children exist, report the breakdown already published and ask before adding, closing or renumbering: a second run that republishes is how a tracker ends up with two of every ticket.

## Gotchas

- A stale graph answers confidently. `index_status` behind HEAD means the call-site counts describe an older tree, and a migration batch sized from them is sized wrong.
- Where claude-mem's file read gate answers a `Read` with its ladder, the timeline titles are usually enough. This workflow cuts a spec it can already see and rarely needs the code at all, so a full read here is a sign you are re-deciding something the spec settled.
- A spec's User Stories are not slices. They are the acceptance surface; several usually collapse into one tracer bullet, and one occasionally needs three.
- A slice you cannot write a `Before` line for is usually not vertical. A horizontal slice delivers a layer, and a layer has no observable end state to fail against, so the missing `Before` is the tell rather than a reason to weaken the proof.
- A slice sized by how much code it touches is sized wrong. Size it by whether one session can carry it from change to evidence, with the repo's own gate run over it.
- Two things here are called triage. Step 6 is the upstream skill, run over the slices this session just published. A tracker-wide re-triage is a different pass with a different scope, and running it from here would re-label work this spec has nothing to do with.

## Procedure

1. **Read the spec** in full, plus its comments, then the `## Notes` of the map it links, and query the spec's existing children. Name the feature's acceptance surface in one sentence.
   → Done when: the spec's Implementation Decisions, Testing Decisions and Out of Scope are in hand, with the map's standing preferences.

2. **Confirm the seams and the blast radius.** `get_architecture` for the modules the spec crosses, then `search_graph` and `trace_path` for each seam it names. Where a mechanical change fans across the tree, `query_graph` for the multi-hop fan-out and count the call sites rather than estimating them, because that count is what sizes the batches in an expand-contract sequence. Then `index_status` for freshness and `check_index_coverage` before citing any path.
   → Done when: every seam is confirmed, carried forward as unconfirmed, or marked proposed where the boundary does not exist yet, and any wide refactor is identified with its call-site count.

3. **Draft the slices.** Read `to-tickets`'s `SKILL.md` and follow it: tracer bullet first, prefactor before the work it eases, expand-contract for a wide refactor, blocking edges on each. Every slice then carries four things of this repo's own: its seam line, its AFK or HITL marking, the gate command from the map's `## Notes`, and a `## Proof` block. A build session opens on the slice and never sees that map, so without the third it derives the gate from the manifest and misses whatever the Notes settled.

   The Proof block is four lines:

   ````
   ## Proof
   - End state: <one observable sentence: what is true once this works>
   - Command: <what to run>
   - Before: <how that command fails today>
   - After: <what it prints once this slice lands>
   ````

   Write `Before` from what the seam does today, not from what the slice will do. A proof that already passes proves nothing, and the repo's own gate is green before the slice exists, so the gate is never the proof.
   → Done when: every slice is vertical, sized to one session, and carries a seam, a marking, its blockers, the gate command, and a Proof block whose `Before` describes a failure that reproduces today.

4. **Quiz the user.** Present the numbered breakdown with title, blocked-by, and what each slice delivers. Ask about granularity, about whether each edge genuinely gates, and about merges and splits. Iterate until approved.
   → Done when: the user has approved the breakdown as it stands.

5. **Publish in dependency order,** blockers first, wiring the blocking relation the way `docs/agents/issue-tracker.md` records it, each slice linked to the spec. `to-tickets` applies `ready-for-agent` at publish and this workflow overrides that: publish unlabelled, because step 6 decides which slices earn the label and some of these are HITL.
   → Done when: every slice has an id, every edge points at a real one, no slice carries a label yet, and you have re-read the published edges rather than trusting the writes.

6. **Triage what you published.** Borrow from `triage`'s `SKILL.md` the role vocabulary, the agent-brief format, and the disclaimer it requires on a brief an agent wrote. Its per-issue interactive machine is for issues arriving from outside and is not what this step runs. Label every slice against `docs/agents/triage-labels.md` and write the brief on each `ready-for-agent` one.
   → Done when: no slice is unlabelled, every slice whose seam is unconfirmed or proposed carries a human-first label naming the seam as its first step, and every `ready-for-agent` slice would start a fresh session from its body alone.

7. **Report** the spec by its title with the link inside the title, the slice count, the frontier, and every slice you left HITL with the reason.
   → Done when: the report names all four.

## Handoff

Close the run with this block, after the step-7 report and with nothing following it.

````
───────────────────────────────────────────────
## ▶ Next · <spec title>

**Build #<ticket>** · <first frontier slice title>

/clear then:

/firehorse:build <ticket>

**Also available:**
- `/firehorse:tickets <spec>` · re-slice; it reads the published slices first and asks before changing any
- `/firehorse:map <map>` · a slice exposed a decision nobody made
───────────────────────────────────────────────
````

- **Clear first.** The next session needs one ticket and a graph trace. This session's context is a whole spec and a breakdown argument, and none of it belongs in the build.
- **Name the tracer bullet,** not the slice that happens to be first in the list. The frontier is every slice with no open blockers; the one to name is the end-to-end path.
- **Every frontier slice is HITL** → say so and name the human decision each one waits on, rather than offering a build the labels forbid.
- **Advisory voice.** The block offers a command. It never says the user must run it, and this workflow never runs it.

## Projection Notes

Upstream skills are referenced, not inlined, so a changed upstream needs no rewrite here — `/firehorse:upstreams-check` reports when one moves.
