---
schemaVersion: 1
id: upstream-scan
kind: workflow
audience: maintainer
title: Upstream scan
description: Sweep newly starred repos and what the last 30 days turned up, judge each one with Jev against what firehorse already has, show you the result as a page you can read, and keep what you dismiss dismissed.
argumentHint: "[--all] [--record] [--repo owner/name] [--skip-discovery]"
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
  orchestration:
    - subagents
upstreamSkills:
  - upstream: mattpocock-skills
    id: research
---

# Upstream scan

## Purpose

Use this workflow when you want to know what you should be paying attention to, and you do not want to read 70 READMEs to find out.

It draws on two sources. Your GitHub stars are things you already thought were interesting and then forgot. The discovery leg is the part you have not seen: named techniques, workflows and repos that gained traction in the last 30 days, which never reaches your stars because you have to already know a thing exists to star it.

`pnpm upstream-scan` judges both. It asks Jev six questions per candidate: whether it is about agentic coding at all, what kind of thing it is, how much it would plausibly improve a named firehorse workflow, whether it duplicates something already built, which workflow it touches, and whether the authors measured anything themselves. The gate that turns those answers into a shortlist lives in `scripts/lib/candidates.ts`, so tightening a threshold never needs a new model call.

You then filter. What you dismiss goes into a mute index and never appears again. That is the part that makes the workflow worth re-running: a scan that shows you the same 40 rejects every month is a scan you stop reading.

The pass reads READMEs and repository trees. It never clones. A deep dive is a separate decision, and step 7 asks a person to make it.

Most of what this finds should close. `docs/EVALUATION-FRAMEWORK.md` says the common outcome is "this overlaps a workflow we have and costs more", and the overlap judgment exists to say so early rather than after a research note.

## Usage

Invoke with no arguments for the full pass: discovery, then judging, then the page, then the filter. `$ARGUMENTS` may carry `--skip-discovery` to judge stars alone, `--all` to re-judge everything the ledger has already seen, `--record` to write the ledger, and `--repo owner/name` for a repo nobody starred, which is what a pasted link needs.

Run it when stars have accumulated, when someone sends a repo worth a verdict, or when you want to know what you have been missing.

## Inputs

- `$ARGUMENTS`: optional `--skip-discovery`, `--all`, `--record`, and zero or more `--repo`.
- `TYPESAFE_API_KEY` in the environment. Without it the script exits and nothing else in this workflow runs.
- Every repo the authenticated `gh` user has starred, with `starred_at`, licence, push date and archived flag.
- `.firehorse/local/upstream-scan/discovered.json`, written by step 2 from a `/last30days:last30days` sweep.
- Each candidate's README head and repository tree, read through the GitHub API.
- `.firehorse/upstream-scan.json`, the committed ledger of what past scans judged and what you muted.
- Every `candidate` issue, open and closed, so a repo already filed is never re-judged.
- `docs/EVALUATION-FRAMEWORK.md` for the intake gate, and `docs/UPSTREAM-SKILLS.md` for what "upstream" means here.

## Outputs

- An HTML page under `.firehorse/local/upstream-scan/`, one per run, with each candidate's summary, link, relevance, value and overlap, and the mute id you name it back by.
- The same pass as Markdown and JSON beside it.
- An updated mute index, so what you dismissed stays dismissed on every machine.
- A research note under `docs/research/upstream-candidates/`, when step 7 approved a deep dive.
- `Evaluation candidate` issues for what survived the deep dive, filed through the issue form.

## Supporting Capabilities

- `pnpm upstream-scan` supplies the judgments and owns the gate; `gh` performs every read and every tracker write.
- `/last30days:last30days` supplies the discovery leg. It is not pinned in `upstreams.lock.json`, so `pnpm upstreams:check` does not cover it and a change in that skill will not be reported. If it is missing, say so, run the pass on stars alone, and carry on.
- `mattpocock-skills:research` runs the deep dive in a background agent, against primary sources.

## Orchestration Intent

The script judges cheaply and in bulk; the expensive steps run only on what it admits. That ordering is the whole design. A research agent runs on what you approved, not on the shortlist. Issues get filed from a research note, not from a README.

The split between the script and this body is load-bearing in one specific way. `/last30days` is a skill, so no script can invoke it: you run the sweep, write `discovered.json`, and the script judges its contents beside the stars. That boundary is also what keeps the script testable, because it never touches the network.

## Gotchas

- **Jev judges a README, which is a pitch.** The first pass got `Yeachan-Heo/oh-my-claudecode` wrong in a way worth remembering: it read as orchestration because that is what the README sells, while the repo's real contribution was a paired-arm benchmark harness. The `authors_measured` judgment and the `benchmark_paths` the script reads from the tree exist to catch that, and neither is a substitute for opening the tree yourself.
- **A high value score is not permission to file.** It is permission to spend a deep dive.
- **Relevance under the threshold with value over it is the interesting bucket**, not a bug. The override admits it because a general-purpose tool reads as irrelevant while still supplying something firehorse lacks.
- **A topic is judged on the sweep's own summary and nothing else.** There is no tree and no licence behind it, so its score rests entirely on how well step 2 described it. A one-line summary gets a one-line judgment.
- **The gate was calibrated on state that has since changed.** The thresholds come from the 2026-09-20 pass over 77 stars, when Jev saw a README and metadata. It now also sees the tree and the licence, and at least one repo moved 0.29 on that richer state. Re-read the below-gate list rather than trusting the boundary.
- **The ledger is committed, so recording a judgment is a claim to the next session.** Record after reading the page, never before.
- **`--record` writes the gate's verdict, not the outcome.** A candidate that was shortlisted, dived into, and rejected stays `shortlisted` in the ledger; the tracker holds the real disposition, which is why the script reads filed candidates separately.
- **A repo can be starred twice over by the same idea.** Check the shortlist against open `candidate` issues by subject, not only by URL. `ripwire` in #210 and `codemap` do the same job under different names, and the script's URL match cannot see that.

## Safety Gates

- **A mute is yours, and the script never overturns it.** A later pass that scores a muted candidate well leaves it muted. Undo is `--unmute <id>`, and only a person runs it.
- **Never mute on the user's behalf.** Step 6 asks. A candidate the user did not name stays visible.
- **The deep dive is asked for, never assumed.** Step 7 stops and puts the question to a person. A shortlist of eight is up to eight research agents and eight issues, which is not a decision this workflow makes on its own.
- **Nothing is filed from a README.** An `Evaluation candidate` issue needs a claim under test and a test that could refute it, and both come from the research note.
- **Issues are filed through the form.** `gh issue create --template candidate.yml`, or a body carrying the same field headings. A bare `candidate` label fakes an intake that never happened.
- **Nothing is vendored.** D-156 stands: firehorse depends on upstream plugins and copies no upstream text. A licence that forbids that, or the absence of one, is a finding for the issue and not something this workflow resolves.
- **The page and the report stay local.** They land under `.firehorse/local/`, which is gitignored, because they quote README text and carry judgments about third-party repos.

## Procedure

1. **Read the ledger's shape** so you know what the pass will hide: `pnpm upstream-scan --skip-discovery` with no other flags reports how many candidates are already judged, filed and muted before it judges anything.
   → Done when: the muted count is known.

2. **Run the discovery sweep** with `/last30days:last30days`, unless `$ARGUMENTS` carries `--skip-discovery`. Use this query, which is written to exclude the things that dominate AI feeds and change nothing here:

   > Named techniques, workflows, and repos in agentic coding that gained traction in the last 30 days. Specifically: named methods for context and memory management across long agent sessions, skill and prompt packaging formats, agent evaluation and paired-trial harnesses, orchestration patterns for multi-agent coding, and structured-judgment models used as control flow (Jev by Typesafe AI and anything comparable). For each: the name people actually use for it, who is using it in production, what it replaces, and whether anyone published numbers. Exclude model releases, funding, benchmark leaderboards, and general AI commentary.

   → Done when: the sweep has returned, or the skill is recorded as unavailable.

3. **Write `.firehorse/local/upstream-scan/discovered.json`** from what the sweep found, in this shape. A repo gets `kind: "repo"` and an `owner/name`; an idea with no repo behind it gets `kind: "topic"`. `signal` is why it surfaced, and it is the field that tells a person whether to care.

   ```json
   {
     "query": "<the query you ran>",
     "ranAt": "<YYYY-MM-DD>",
     "items": [
       { "kind": "topic", "name": "Loop engineering", "summary": "<one or two sentences>", "signal": "<who is talking about it, and where>" },
       { "kind": "repo", "name": "owner/name", "summary": "<one or two sentences>", "signal": "<why it surfaced>" }
     ]
   }
   ```

   → Done when: the file parses and every item carries a summary worth judging.

4. **Judge everything:** `pnpm upstream-scan --discovered`, adding `--all` or `--repo` as `$ARGUMENTS` asked.
   → Done when: the run reports a page path.

5. **Open the page and read it**, then check two things the script cannot. Look in the below-gate list for a candidate whose README undersold it, which usually shows as a high value score held back by low relevance. Then open the tree of every shortlist entry whose `authors_measured` reads no but whose benchmark paths are non-empty, because that combination means the repo measured something and did not say so.
   → Done when: both checks are done and any rescue is named with a reason.

6. **Put the filter to the user.** Show the shortlist and the below-gate list, each entry with its relevance and its mute id, and ask which ones they never want to see again. Mute exactly what they name and nothing else: `pnpm upstream-scan --mute <id> --mute <id>`.
   → Done when: the user has named what to mute, or declined to mute anything, and the ledger reflects it.

7. **Put the deep dive to the user.** Name each survivor, the workflow it would touch, and what is still undecided about it. Ask which ones deserve a research note. Stop here for an answer.
   → Done when: the user has named the repos to dive into, or declined all of them.

8. **Run the deep dive** for each approved candidate with `mattpocock-skills:research` in a background agent, against primary sources: the source tree, the licence, the commit history, the authors' own measurements. Write to `docs/research/upstream-candidates/`.
   → Done when: each approved candidate has a research note citing file paths rather than README claims.

9. **File an `Evaluation candidate` issue per candidate the note still supports**, scoped to the part that survived. Fill the five required fields, and scope the claim to the skill or sub-plugin worth testing rather than the whole repo, when the note says the repo as a whole is a reject.
   → Done when: each surviving candidate has an issue, and each rejected one has a line in the note saying why no issue was filed.

10. **Run `pnpm upstream-scan --record`** so the next pass does not re-judge what this one settled.
    → Done when: the ledger's count matches what the page judged.

11. **Report** the discovery sweep's yield, the shortlist, what was muted, the dives taken and declined, the issues filed, and what is left undecided with what each one waits on.
    → Done when: all six are present.

## Handoff

Render this block only when step 9 filed at least one issue. A pass that shortlisted nothing, or that ended at the step-7 decline, ends at the step-11 report.

```
───────────────────────────────────────────────
## ▶ Next · <repo name>

**Place the new candidates** · <n> candidate issues filed, not yet grouped

/clear then:

/triage
───────────────────────────────────────────────
```

- **No issues filed, no handoff.** A scan that produced a shortlist and no issues has not changed the tracker, and the session that ran it can keep working.
- **Never offer the deep dive in the block.** It was asked in step 7 and answered; a block that re-offers it invites a second pass over candidates nobody re-read.
- **Advisory voice.** The block offers a command. It never says the user must triage now.

## Projection Notes

The six judgments, the gate, the ledger format and both renderings live in `scripts/upstream-scan.ts` and `scripts/lib/`, not in this body. This definition says when to run the pass, what the script cannot decide, and where the workflow stops to ask.

The discovery query in step 2 is the exception, and it belongs here rather than in the script. It is a prompt, it will be edited by whoever reads the results, and the script never runs it.

Maintainer audience for two reasons. The pass is repo-local, and it reads the authenticated user's own stars, which is a maintainer's reading list rather than a user's. A user-facing `/firehorse:upstream-scan` would need the pass packaged in `firehorse-core`, a candidate form it could not assume, and a source of candidates that is not one person's stars.
