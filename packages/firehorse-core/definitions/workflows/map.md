---
schemaVersion: 1
id: map
kind: workflow
title: Map
description: Chart or work a wayfinder map, and pre-fill the map's Notes with this repo's standing preferences so every later session inherits them.
argumentHint: "[loose idea | map issue URL or number] [ticket URL or number]"
requires:
  tools:
    - read
    - bash
  environment:
    - filesystem
    - git
    - github
optional:
  tools:
    - grep
    - ls
    - edit
    - mcp:codebase-memory-mcp
    - cli:supermemory
  orchestration:
    - subagents
  environment:
    - node
    - pnpm
upstreamSkills:
  - upstream: mattpocock-skills
    id: wayfinder
  - upstream: mattpocock-skills
    id: grilling
  - upstream: mattpocock-skills
    id: domain-modeling
---

# Map

## Purpose

Use this workflow instead of invoking `wayfinder` directly. It adds one thing: the map's `## Notes` block is written from what this repo actually has, so the standing preferences reach every session that loads the map days later.

Wayfinder defines `## Notes` as "domain; skills every session should consult; standing preferences for this effort" and leaves the content to the caller. This workflow supplies that content, and it is the only carrier for those preferences.

The content comes out of `.firehorse/manifest.json`, which `/firehorse:new-project` and `/firehorse:index` wrote. This workflow reads that record rather than re-establishing what it already says.

## Usage

Invoke the generated command with a loose idea to chart a new map, or with a map issue URL or number to work through one. `$ARGUMENTS` carries whichever you gave, plus an optional ticket when you want to name the ticket yourself.

## Inputs

- `$ARGUMENTS`: a loose idea, or a map issue reference, optionally followed by a ticket reference.
- `.firehorse/manifest.json` — the one read that answers which anchors this repo has and whether the graph and supermemory passes last succeeded. `/firehorse:new-project` and `/firehorse:index` wrote it; this workflow does not re-derive it.
- `package.json` scripts, for the verification command.
- The Resolved upstream skills table under [Supporting Capabilities](#supporting-capabilities), for the skills the Notes block may name.

## Outputs

- A `wayfinder:map` issue whose `## Notes` carries the resolved preferences block, or an existing map whose Notes you brought up to date.
- Child decision tickets, wired with the tracker's native blocking.
- One resolution comment per ticket you closed, plus the matching line in the map's Decisions-so-far.

## Supporting Capabilities

- `mattpocock-skills` / `wayfinder` owns the map and ticket mechanics; `grilling` and `domain-modeling` run on every `wayfinder:grilling` ticket.
- `codebase-memory-mcp` and the `supermemory` CLI are optional, and decide whether two paragraphs of the Notes block get emitted at all.

## Orchestration Intent

You run the probe and write the Notes block yourself, then read `wayfinder`'s `SKILL.md` and follow it as written — it is user-invoked only, so an agent reaches it by reading the file, never by invoking it. Wayfinder owns the map's shape, the ticket types, the claim, and the one-ticket-per-session rule. This workflow owns the Notes block and the gate on it. Research tickets still resolve through `mattpocock-skills:research` subagents, as wayfinder specifies.

## Safety Gates

- **The Notes block stays under 200 words.** Count before writing; over the cap, stop and report it — the surplus belongs in `CONTEXT.md` or `docs/agents/`, which the Domain line already points at.
- **Every line points at something the manifest or the resolved table confirms.** One dead pointer teaches the next session that the whole block is decorative.
- **A pass that last failed is not a preference.** `index.graph` or `index.supermemory` false or absent → omit that paragraph rather than naming the tool.
- **The map and its tickets live in the tracker** the tracker doc records, never a markdown draft committed beside the code.
- **One ticket per session**, research tickets excepted.
- **The map indexes; the ticket holds the detail.** A decision is recorded once.

## Notes block

The template. Braced tokens are resolved from the probe; every other character is constant text.

```markdown
**Domain:** `CONTEXT.md` carries this repo's vocabulary.{ANCHORS}

**Query the graph before you read files.** `codebase-memory-mcp`: `search_graph` for the
symbol you are about to change, `trace_path` for its callers. Structure first, files second.
Cite only paths you actually opened.

**Search prior work before you re-derive it.** Run `npx supermemory search "<the question
you are about to answer>"` before any decision that sounds like one this repo has already
made. If it comes back empty, say so in one line and move on.

**Skills every session should consult:**
{SKILLS}

**Standing preferences:** small, reviewable commits; `{GATE}` green before any ticket
closes.
```

**`{ANCHORS}`** — append one clause to the Domain sentence per `anchors` field that is `true`, in this order:

| `anchors` field | Clause                                                                   |
| --------------- | ------------------------------------------------------------------------ |
| `agents`        | Tracker, label and persistence conventions are in `docs/agents/`.        |
| `design`        | `DESIGN.md` states the intended direction — read it before proposing UI. |
| `adr`           | Binding decisions are the ADRs under `docs/adr/`; don't relitigate them. |

No anchor is `true` → the Domain line is the `CONTEXT.md` sentence alone. `anchors.context` false or absent → drop the Domain line.

**`{SKILLS}`** — one bullet per skill in the Resolved upstream skills table under [Supporting Capabilities](#supporting-capabilities), which already resolved against `upstreams.lock.json`, so a renamed upstream cannot land here as a dead reference. Name each by its `plugin:skill` invocation: `mattpocock-skills:grilling` and `mattpocock-skills:domain-modeling` on every `wayfinder:grilling` ticket; `mattpocock-skills:tdd` on tickets that change code; `mattpocock-skills:code-review` before opening a PR; `impeccable:impeccable` on anything with a UI surface. A skill the table marks unresolved is dropped without comment.

**`{GATE}`** — derived from this repo, never assumed: the typecheck and test scripts its manifest declares, joined with `&&`, each run through the package manager its lockfile names — `pnpm typecheck && pnpm test` in a pnpm workspace, `npm run typecheck && npm test` where the lockfile is npm's. A repo whose gate has a third script, a `definitions:check` say, names it too. No gate script, no clause.

**Conditional paragraphs** — emit the graph paragraph only when `index.graph` is `true`, and the supermemory paragraph only when `index.supermemory` is `true`. Either one false or absent means that pass did not succeed here, and a preference pointing at it would be a dead pointer.

## Procedure

1. **Read `.firehorse/manifest.json`** for `anchors` and `index`, and `package.json` for the gate script. That is the whole input gathering — `/firehorse:new-project` established this repo once, and re-checking what it established is work this workflow does not repeat. No manifest → the repo has not run `/firehorse:new-project`; say so and stop.
   → Done when: `anchors`, `index.graph`, `index.supermemory`, and the gate script are in hand.

2. **Resolve the Notes block** from what step 1 read, following [Notes block](#notes-block).
   → Done when: no braced token remains, and every clause and skill named traces to a manifest field or a resolved table row.

3. **Check the word count.** Over 200 words, stop and report it rather than writing a shorter paraphrase.
   → Done when: the count is under the cap, or the run has stopped.

4. **Hand off to `mattpocock-skills:wayfinder`.** It is user-invoked only, so read its `SKILL.md` at the path in [Supporting Capabilities](#supporting-capabilities) and follow it rather than invoking it. Charting → give it the resolved block as the map's `## Notes` at the point where it creates the map. Working an existing map → read its Notes first, and where the block is missing or disagrees with the manifest, update the Notes before you choose a ticket.
   → Done when: the map's Notes match what the manifest records.

5. **Work the map** as `mattpocock-skills:wayfinder` specifies — name the destination, map the frontier, claim one ticket, resolve it, record the resolution, graduate the fog.
   → Done when: one ticket is resolved and its resolution comment is on the ticket with the matching line on the map.

6. **Report** the map by its title with the link inside the title, the ticket you resolved, and the Notes block you wrote or left alone.
   → Done when: the report names all three.

## Projection Notes

`wayfinder` and the skills named in the Notes block load through Claude's own skill mechanism; this definition creates no execution graph.
