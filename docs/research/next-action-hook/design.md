# What Firehorse should build

The short version: most of what you want is not a model problem, and the part that is a model
problem is smaller than it looks. Build it in four stages and stop when it stops paying.

## Stage 0: the handoff block (no hook, no model)

Every Firehorse workflow ends without saying what comes next. `grep -rn "next step\|Next
up\|/clear" packages/firehorse-claude/commands/firehorse/*.md` returns nothing. That is the
whole gap for the case the user described, and GSD closes it with text.

Give each workflow a final step that renders a fixed block:

```
───────────────────────────────────────────────
## ▶ Next · [firehorse] <map title>

**Build #218** · <ticket title>

/clear then:

/firehorse:build 218

**Also available:**
- /firehorse:map · pick a different ticket
- /firehorse:index · the graph is 14 commits stale
───────────────────────────────────────────────
```

Rules to carry over from GSD, with its issue numbers where it recorded the reason:

- **One primary next command, fully argument-filled.** Alternatives go under
  `Also available:` so the recommendation stays a recommendation.
- **`/clear then:` only where a fresh session is genuinely better.** GSD writes its exception
  down (`resume-project.md:237`: resume is already a session-entry flow, so no `/clear`), and
  Firehorse should write down its own. `/firehorse:map` handing off to `/firehorse:build`
  wants a clear. `/firehorse:build` handing off to `/firehorse:ship` on the same branch
  probably does not.
- **Advisory voice, never imperative** (GSD #884). "Inform the user so they can run X at the
  next natural stopping point," not "run X".
- **Lint it.** GSD duplicates the block across 65 command files and its command-contract lint
  checks frontmatter but not the block. Firehorse has `packages/firehorse-core/src/definitions/`
  with a validator already; put the handoff block in the definition schema so a workflow
  without one fails validation.

This costs no latency, no API key, and no accuracy risk. Do it first, alone, and see how much
of the problem is left.

## Stage 1: `.firehorse/session.json`

Advice that lives only in the last assistant message dies at `/clear`, which is exactly when
it is needed. GSD survives this because `.planning/STATE.md` is on disk and
`workflows/transition.md` recomputes position from files rather than memory.

Firehorse already has `.firehorse/manifest.json` for setup state. Add a sibling for position:

```json
{
  "workflow": "map",
  "status": "completed",
  "ticket": 218,
  "branch": "outgoing-painter",
  "started_at": "2026-09-20T18:04:11Z",
  "completed_at": "2026-09-20T19:22:40Z",
  "next": { "command": "/firehorse:build 218", "clear_first": true }
}
```

Each workflow writes it at start and at end. Now the recommendation is a function of disk
state, and both the `SessionStart` hook and a `Stop` hook can read it.

## Stage 2: the Stop hook, deterministic first

Register a `Stop` command hook in the existing `packages/firehorse-claude/hooks/hooks.json`,
5 second timeout, alongside the two `SessionStart` hooks already there.

It emits `systemMessage`, never `additionalContext`. On `Stop`, `additionalContext` restarts
the turn instead of ending it (see [hook-surface.md](hook-surface.md)), which would make the
session refuse to finish. `SessionEnd` discards `systemMessage` entirely, so it is not an
option.

Three checks, all pure code, all answering questions currently asked by hand:

| Check | How | Message |
|---|---|---|
| Claimed ticket unresolved | `gh issue view N --json comments,state` against `.firehorse/session.json` | "#218 has no resolution comment. `/firehorse:map` step 5 expects one before the ticket closes." |
| Workflow finished, successor known | `session.json` `next` field | "▶ Next: `/firehorse:build 218`. Start a fresh session first." |
| Index stale | commit ancestry vs `manifest.json` `index` | "The graph is 14 commits behind. `/firehorse:index` before the next build." |

Fail open on everything. Exit 0 and print nothing on any error, missing file, or `gh` failure.
GSD's context monitor has a 10 second stdin timeout that exits 0 rather than hang, with a
comment naming the Windows and Git Bash pipe cases that forced it; copy the posture.

Debounce it. GSD warns at most once per five tool calls, with severity escalation bypassing
the debounce. A `Stop` hook fires once per turn, so the equivalent is: say nothing if the same
message was emitted in this session already, unless the state it describes changed.

**The tracker question is deterministic.** "Did it update the issue tracker" is answerable by
`gh issue view`. Do not pay a model for it.

## Stage 3: inference, only for what code cannot answer

Two questions survive Stage 2:

1. **Does the diff actually satisfy the ticket?** `requirements_satisfied` in Foreman's
   vocabulary. Reading a git diff against a ticket body is a judgment call.
2. **The user is not in a workflow at all. Which skill fits?** The
   [skill suggestion](jev-fit.md) problem, over Firehorse's roster of about a dozen rather
   than Hermes' 182.

Prototype both with a `type: "prompt"` hook before writing any Jev code. Prompt hooks are
supported on `Stop`, run a Claude model (Haiku by default), need no API key, no SDK, no
version pin, and fit entirely in the hooks JSON. If the latency or the cost turns out to
matter, port to Jev then, with a measured baseline to port against.

If it goes to Jev, the shape is settled by the two prior sources:

- **One call.** A dozen options is far under the 255 `Choice` limit, so the cookbook's second
  request earns nothing. One `Choice` over the roster plus the gate `Noul`s.
- **Gates as named probabilities, thresholds in code.** Foreman's split. Start from its
  vocabulary: `requirements_satisfied`, `tests_sufficient`, `needs_verification`,
  `needs_human`, `work_off_track`. Add `tracker_updated` only if Stage 2's `gh` check proves
  insufficient.
- **Several gates must agree to say "done".** Foreman needs `ready_to_finish ≥ 0.75` *and*
  `requirements_satisfied ≥ 0.75` *and* `tests_sufficient ≥ 0.75`. One gate alone is not a
  verdict.
- **State is a small fixed struct,** built from `git status`, `git diff` (truncated;
  Foreman caps at 20,000 characters), `changed_files`, the ticket body, and the resolved
  `session.json` position. Not the transcript. Jev degrades on indirection and on large state
  full of irrelevant detail, and a transcript is both.
- **Every question states its null case.** Foreman's `agents_md_drift` says "Answer no when
  no AGENTS.md instructions are present or the evidence is insufficient." An unanswerable
  question still returns a number.
- **Pin `jev-1.13.0`,** log the version each response reports, and treat any threshold as
  bound to that version. `jev-latest` moves.

## What not to build

- **A concurrent supervisor.** Foreman runs a Python `asyncio` loop that assesses live worker
  subprocesses. Claude Code hooks give no such loop, and Firehorse has no worker fleet.
- **`additionalContext` on Stop.** It is the obvious first attempt and it does the opposite of
  what is wanted.
- **An async hook for the banner.** Async hook output goes to Claude on the next turn and is
  never shown to the user.
- **A model call on every turn.** Stage 2's checks resolve most turns to silence. Reach for
  inference only after the deterministic path has said nothing.

## Measuring it

`docs/EVALUATION-FRAMEWORK.md` already defines the intake gate, the paired-trial method, and
the session-retro loop. This is an `Evaluation candidate` and should go through it rather than
around it. The metric the sources suggest is the cookbook's own pair: how often the suggestion
is wrong, and how often one is given when nothing applies. The floor is not zero; the cookbook
measures 2.5% wrong loads even when the agent is handed the right answer.

One honest note on the evidence. Foreman publishes no accuracy numbers and calls itself an
experiment. The `docs/research/jev/` corpus found that of 61 agentic-workflow tools built on
Jev, exactly one publishes a precision number. The cookbook's 488-request table is the only
measured result in any of these sources, and it measures skill selection, not next-action
recommendation. Stage 0 through Stage 2 need no such evidence because they contain no
inference. Stage 3 does.
