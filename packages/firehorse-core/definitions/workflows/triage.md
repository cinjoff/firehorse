---
schemaVersion: 1
id: triage
kind: workflow
audience: maintainer
title: Triage
description: Re-triage the whole open tracker — judge every issue's group, kind, readiness and urgency with Jev, apply what clears its threshold, and report what a person still has to decide.
argumentHint: "[--apply] [--only 245,246]"
requires:
  tools:
    - read
    - bash
    - grep
  environment:
    - filesystem
    - node
    - pnpm
    - github
optional:
  tools:
    - edit
---

# Triage

## Purpose

Use this workflow when the tracker has drifted: issues filed across several sessions, each one sensible on its own, with no shared position on what belongs together or what to do next. It re-judges every open issue and leaves the tracker grouped, labelled, and ranked.

`pnpm triage` does the judging. It asks Jev four questions per issue — which map's outcome it moves, what kind of work it is, whether an agent could finish it from the body alone, and what it costs to leave undone — plus three yes/no questions that map onto this repo's label vocabulary. The thresholds and the label policy live in `scripts/triage.ts`, not in the model, so tightening a rule never needs a new model call.

What the script cannot do is see that a cluster has no map. That is this workflow's job, and it is where most of the value is: an issue Jev cannot place is usually not a bad issue, it is an issue whose goal was never chartered.

## Usage

Invoke with no arguments to judge and report, changing nothing. `$ARGUMENTS` may carry `--apply` to run the actions that cleared their threshold, and `--only <numbers>` to judge a named subset.

Run it when a research or retro burst has just landed a batch of issues, before charting a new map, or on any session that opens with "I can't tell what to work on".

## Inputs

- `$ARGUMENTS`: an optional `--apply`, an optional `--only`.
- `TYPESAFE_API_KEY` in the environment. Without it the script exits and nothing else in this workflow runs.
- Every open issue in the tracker, and every open `wayfinder:map` with its sub-issues, read through `gh`.
- `docs/agents/issue-tracker.md` for the label vocabulary and the sub-issue mechanics.
- `docs/agents/triage-labels.md` for what each triage role means.

## Outputs

- A report under `.firehorse/local/triage/`, with the raw judgments beside it as JSON.
- Issues labelled and attached to maps, when `--apply` ran.
- A named list of clusters that no open map owns, each with the map it argues for.
- The issues left to a person, and what makes each one undecidable by the pass.

## Supporting Capabilities

- `pnpm triage` supplies the judgments and owns the policy; `gh` performs every tracker write.
- This workflow orchestrates no upstream skill. `upstreamSkills` is empty by design, as in `upstreams-check`.

## Orchestration Intent

The script judges one issue at a time against the maps that exist. You read the low-confidence bucket, which is the pass's real output: when several issues land there together and share a subject, the tracker is missing a map, and a map you charter changes what the next run can see. So the sequence is judge, charter, re-judge, apply — never apply first.

## Gotchas

- Jev judges each issue against the maps present at that moment. A new map changes the grouping of issues nobody touched, which is why step 5 re-runs rather than reusing the first report.
- A high group confidence is a claim about fit, not about whether the map should exist. Three issues placed at 1.00 under a map whose destination they only half serve is still a mis-grouping.
- The model reads "found while working on X" as session history. The `retro` label therefore needs the judgment **and** the body citing a session artifact; it over-applies on the judgment alone.
- `candidate` is never applied by the pass. `docs/agents/issue-tracker.md` files a candidate through `gh issue create --template candidate.yml` with the five intake fields, and a label alone would fake that.
- An issue already carrying a triage label keeps it. Disagreeing with a human's readiness call is a report line, not an edit.

## Safety Gates

- **The dry run comes first.** `--apply` runs after a report has been read, never as the first call.
- **A new map is written by hand.** The pass names the cluster; the map's destination, notes and out-of-scope are authored, not generated.
- **Existing triage labels are never overwritten**, and `wayfinder:` tickets never receive one.
- **A `parked` issue is not judged.** A parked concept is not a work item, and triaging one turns a deferral into a work item by accident.
- **Nothing is closed, and nothing is removed.** The pass adds labels and attaches sub-issues. Deciding an issue is dead is a person's call.
- **The report stays local.** It lands under `.firehorse/local/`, which is gitignored, because it quotes issue bodies and names judgments the tracker does not carry.

## Procedure

1. **Run `pnpm triage`** with no arguments and read the report it names.
   → Done when: the report exists and the ranked table has been read.

2. **Read the low-confidence bucket for clusters.** Group the issues the pass could not place by subject, and for each cluster of three or more, say whether it is a missing map or a set of genuinely unrelated leftovers.
   → Done when: every cluster has one of those two verdicts.

3. **Charter a map per missing cluster**, with the destination, notes, standing preferences, and out-of-scope sections the existing maps carry. Label it `wayfinder:map`.
   → Done when: each missing cluster has an open map issue, or was ruled a leftover in step 2.

4. **Check the vocabulary section.** Every violation it lists is a rule from `docs/agents/issue-tracker.md` that an open issue breaks. Fix each by hand.
   → Done when: the section is empty, or each remaining line has a reason to stand.

5. **Re-run `pnpm triage`** so the new maps are in the criteria, and read the grouping again.
   → Done when: the clusters from step 2 have landed under their maps, or the confidence says they have not.

6. **Apply:** `pnpm triage --apply`. Then verify the attachments landed with the sub-issue query in `docs/agents/issue-tracker.md`.
   → Done when: each map's children match what the report proposed.

7. **Place what the pass left over by hand.** For each issue still unattached, read the top three probabilities in the JSON and decide, or record that it has no home yet.
   → Done when: every leftover is attached or named as homeless.

8. **Report** the actions applied, the maps chartered, the vocabulary fixes, and the issues left to a person with what each one waits on.
   → Done when: all four are present.

## Handoff

Render this block only when step 3 chartered a map. A pass that changed labels and grouping alone ends at the step-8 report.

```
───────────────────────────────────────────────
## ▶ Next · <repo name>

**Chart the new map** · <n> maps chartered, tickets not yet cut

/clear then:

/firehorse:map
───────────────────────────────────────────────
```

- **No new map, no handoff.** Re-grouping under maps that already exist is maintenance, and the session that ran it can keep working.
- **Never offer `--apply` in the block.** It has already run by then, and a block that suggests it invites a second pass over a tracker nobody has re-read.
- **Advisory voice.** The block offers a command. It never says the user must chart the tickets now.

## Projection Notes

The judgments, thresholds and label policy live in `scripts/triage.ts`, not in this body — this definition says when to run the pass and what to do with what it cannot decide. The script is repo-local, so this definition is maintainer-audience: a user-facing `/firehorse:triage` would need the pass packaged in `firehorse-core` and a tracker-agnostic label vocabulary.
