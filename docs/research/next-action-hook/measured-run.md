# The first measured run, and what it corrected

[jev-fit.md](jev-fit.md) was a design study: the cookbook's recipe read carefully, with
nothing run. On 2026-09-20 the recipe was run against this machine's real session history.
This records what the measurement changed, including two of that document's own design notes.

**Corpus:** 28 real user prompts from the five most recent sessions of 2026-09-20, all on the
firehorse repo, all research and docs work. **Roster:** 135 entries, being the 130 skills the
agent actually had plus five MCP servers. **Model:** `jev-latest`, which the responses reported
as `jev-1.13.0`. **Harness:** the `skill-audit` skill, shipped in 0a79f07.

## Correction 1: the gates do not discriminate for a coding agent

`jev-fit.md` design note 1 says to write the gates about whether an action is wanted rather
than about subject matter. That is the cookbook's own advice, and for Hermes it separates
_explain what a monad is_ from a request that needs a skill.

It separates nothing here. Every turn in a coding agent acts on the user's files, so
`acts_on_user_system` is near-constant. Across a sweep of gate thresholds from 0.30 to 0.60,
the confusion matrix did not move by a single case: every threshold produced the same counts.
All of the discrimination came from the second request's per-candidate `fits` Nouls.

The gates that do separate a coding turn ask about the *shape of the turn*, not the action:

- does this start new procedural work, or continue a step already underway
- would an expert consult a documented workflow, or work it out from the repo
- is this a short reply, approval or redirection inside work already running
- could a generalist answer it in prose

With those, the recipe stayed correctly silent on "ok are we done with this session?" (0.82
confidence) and "workshop is not part of my repo, ignore that" (0.84), which is the behaviour
the original gates could not produce.

## Correction 2: the second request is where the work happens

Design note 2 says Firehorse's roster is around a dozen, so the second request earns nothing
and one call is the whole thing.

The roster is not a dozen. The agent's actual list on this machine was 130 skills and 67 MCP
tools, because the plugin set, not the Firehorse workflow set, is what reaches the system
prompt. At that size the wide `Choice` is confident and often wrong in a specific way: it
ranks a plausible neighbour first. `firehorse:map` ranked first on two turns where its own
`fits` Noul scored **0.13**.

That gap is the whole value of request two. Dropping it would have suggested `firehorse:map`
on turns where the model, asked directly, says it does not do the thing being asked for.

## Confirmed: literal reading, twice

`jev-fit.md` lists literal reading among the jaggedness modes that bite. Both instances cost
real time, and both match what [`../jev/method.md`](../jev/method.md) already recorded when the
catalog's Noul gate misfired.

**A compound Choice collapses.** Classifying 135 roster entries with one Choice offering
remove, scope-to-another-repo, redundant-with-sibling, keep-rare and keep-core produced 98
removes and **zero** for either middle option, which never exceeded 0.23 probability on any
entry. Split into two literal Nouls, "does this work occur in these repos" and "should this be
uninstalled entirely", the same 98 entries resolved to 1 uninstall and 27 scope-elsewhere.

**A skill's description answers for the mechanism it names.** `firehorse:map` describes
charting a wayfinder map. It is reached for when a loose goal needs breaking into tracked work.
Asked whether it does the specific thing those requests asked for, Jev said 0.13 both times,
and it was right about the description.

## Cost, against the 5 second hook timeout

Two requests per prompt: **1.6s median, 1.9s p90, about 8,200 tokens**, on a 135-entry roster.
That fits the timeout with room, and `jev-fit.md`'s conclusion that latency rather than bill is
the constraint holds. Halving the roster halves the dominant cost, since the wide `Choice`
carries every description.

## What this run does not establish

- **No deterministic baseline was measured**, which #203 makes binding and #262 now tracks. A
  token-overlap match might reproduce these results at zero cost, and nobody has checked.
- **No hand-checked false-positive rate.** 28 prompts, one working day, one repo, all of it
  research and docs work. Nothing here says anything about bug-fixing or feature-building turns.
- **Thresholds are not transferable.** The cookbook's 0.30 was too permissive on this data and
  0.50 too strict; the shipped default of 0.35 came from a sweep on these 28 prompts and should
  be re-swept on any other corpus.
- **The agent-side half is unmeasured.** The cookbook's headline numbers come from measuring
  whether the agent then loads the suggested skill. This run measured the suggestion only.
