# How GSD actually recommends the next action

GSD does not decide the next action with a hook, and it does not decide it with a model.
It writes the answer into the workflow that just finished, reads durable state at session
start, and uses hooks only for the two things a workflow cannot see from inside itself.

Read from `gsd-build/get-shit-done` at commit `bdcaab2c`, version `1.50.0-canary.0`,
cloned 2026-09-20.

## Layer 1: the `<offer_next>` contract

Every user-facing workflow ends with an `<offer_next>` block that the agent renders
verbatim. Here is the real one from `get-shit-done/workflows/plan-phase.md:1715`:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 GSD ► PHASE {X} PLANNED ✓
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Phase {X}: {Name}** — {N} plan(s) in {M} wave(s)

...

## ▶ Next Up — [${PROJECT_CODE}] ${PROJECT_TITLE}

**Execute Phase {X}** — run all {N} plans

/clear then:

/gsd:execute-phase {X} ${GSD_WS}

**Also available:**
- cat .planning/phases/{phase-dir}/*-PLAN.md — review plans
- /gsd:plan-phase {X} --research — re-research first
- /gsd:review --phase {X} --all — peer review plans with external AIs
```

Four things are doing the work, and all four are cheap:

1. **`/clear then:`** is the session boundary the user described. It is a literal string in
   the workflow text, not a computed decision. Eleven workflows carry it.
2. **One primary next command,** fully argument-filled, ready to paste.
3. **`Also available:`** demotes the alternatives instead of hiding them, so the
   recommendation stays a recommendation.
4. **A stated exception.** `resume-project.md:237` says: "Resume-specific exception: do
   **not** emit `/clear then:` here. Resume is already a session-entry flow, so the next
   command should be shown directly." Somebody hit the case where the advice fires at the
   wrong moment and wrote the carve-out down.

The block is duplicated per workflow rather than shared. `scripts/lint-command-contract.cjs`
enforces the frontmatter contract across all 65 command files (name, description,
`allowed-tools`, resolvable `@`-refs) but does not enforce `offer_next`. That is a gap in
GSD, not a design choice worth copying.

## Layer 2: durable state, not conversation state

`.planning/STATE.md` holds the position. `workflows/transition.md` is an internal workflow,
never user-invoked, that reads `STATE.md`, `PROJECT.md`, `ROADMAP.md`, plan files, and
summary files, counts `*-PLAN.md` against `*-SUMMARY.md` to decide whether a phase is
complete, and checks for verification debt before advancing. `/gsd:progress --next`
auto-detects and runs the next step from the same state.

This is why the advice survives `/clear`. The next action is a function of files on disk,
not of what the agent remembers.

## Layer 3: hooks, for what the workflow cannot see

`bin/install.js` registers four, all emitting `hookSpecificOutput.additionalContext`:

| Hook | Event | Matcher | Timeout | Opt-in |
|---|---|---|---|---|
| `gsd-context-monitor.js` | PostToolUse | `Bash\|Edit\|Write\|MultiEdit\|Agent\|Task` | 10s | no |
| `gsd-workflow-guard.js` | PreToolUse | `Write\|Edit` | 5s | `hooks.workflow_guard` |
| `gsd-phase-boundary.sh` | PostToolUse | `Write\|Edit` | 5s | `hooks.community` |
| `gsd-session-state.sh` | SessionStart | none | default | no |

**The context monitor is the one that says "wrap up".** A statusline hook writes metrics to
`/tmp/claude-ctx-{session_id}.json`; the PostToolUse hook reads them after each tool call
and injects a warning at 35% remaining and a harder one at 25%. It debounces to one warning
per five tool calls, and a warning-to-critical escalation bypasses the debounce. Metrics
older than 60 seconds are ignored. On critical with an active GSD project it fires
`gsd-tools state record-session` once as a detached subprocess, so the crash moment is
recorded before context runs out.

Its message text carries a rule worth stealing, tagged to issue #884 in the source comment:
*never use imperative commands that override user preferences*. The critical message reads
"Inform the user so they can run `/gsd:pause-work` at the next natural stopping point," not
"run `/gsd:pause-work`". Outside a GSD project it goes further: "Do NOT autonomously save
state or write handoff files unless the user asks."

**The phase-boundary hook is 45 lines of bash** and does one thing: if a `PostToolUse`
Write or Edit touched `.planning/`, emit `".planning/ file modified: {file}\nCheck: Should
STATE.md be updated to reflect this change?"`. It is a drift sensor, not a planner.

Both hooks fail open. The context monitor has a 10-second stdin timeout that exits 0 rather
than hanging, with a comment naming the Windows and Git Bash pipe cases that forced it.

## What to take from this

The next action comes from the workflow graph, which is static, plus position, which is on
disk. Neither needs inference. The hooks exist only for conditions invisible from inside a
workflow step: how full the context is, and whether the user edited state outside the flow.

Firehorse has none of the three layers today. No `firehorse` command or skill emits a next
step; `grep -rn "next step\|Next up\|/clear" packages/firehorse-claude/commands/firehorse/`
returns nothing.
