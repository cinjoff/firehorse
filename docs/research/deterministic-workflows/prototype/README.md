# Route prototype (#307)

This is a throwaway prototype, deliberately not a workspace package. It models Firehorse's route
(`map → spec → tickets → build → ship`) as a `@statelyai/agent` machine. Sessions, Jev and the
person are all scripted.

```sh
npm install        # pins @statelyai/agent 2.0.0-alpha.25 and xstate 6.0.0-alpha.60; Node >= 22.18
node route.mjs     # all four scenarios
node route.mjs red-gate
```

## What it models

| Ruling | Where it lives in `route.mjs` |
|---|---|
| A step is a Superset session, then a wait (#298, #304) | `session()` starts the session and lands in a `*Wait` state tagged `awaiting-session`. The host exits there and is woken by `SESSION_DONE` |
| Code decides the checkable transitions (#305) | The `mapChoose` and `gateCheck` choice states |
| Jev picks among the legal events (#305) | `mapFogJudgement` runs `agent.decide` over `GRADUATE_FOG`, `SPEC_IT` and `NONE_OF_THESE`. The host's `decide` adapter owns the 0.8 threshold |
| The fallback is a person, offered today's `▶ Next` options (#305) | The `mapFogHuman`, `gateRedHuman` and `mapBlocked` states, each tagged `awaiting-human` with `meta.interaction` |
| The gate is re-run, never read from prose (#299) | The host re-runs the gate after a build session and sends the result as evidence |
| One run per map, a short-lived host, an idempotency key `map/ticket/step` (#304) | Every wake is a fresh `runAgent` call against the same log store |

The Jev seam is the case #301 found no handoff covers: a map with no open tickets but fog
remaining. `lintAgentMachine` reports no findings.

## What it showed

1. **Guards must read only what arrived in an event.** The first version's guards read the
   tracker live. The next wake replayed the log against a world that had moved, and threw
   `AgentReplayDivergenceError`. The fix is that the host gathers the evidence (frontier, fog,
   gate) and sends it as the `SESSION_DONE` payload, and guards read only `context`.
   **For the spec: the outcome line plus the host's confirmation becomes the event payload.
   Nothing reaches a guard any other way.**
2. **A run starts once.** Passing `input` on a later wake silently starts a fresh run, and the
   route loops. Only the first wake passes `input`, and every later wake passes the event alone.
3. **`map/ticket/step` is not unique enough.** In `red-gate`, all three build sessions got the
   same key, so a retry would reuse the failed session. The key needs an attempt number, unless a
   retry is meant to send a follow-up into the same session. That is a decision.
4. **Build has no slice.** After `tickets`, the machine does not know which slice to build, and
   it builds exactly once. The real route loops `build → ship` per slice (tracer bullet first).
   That is a missing state, not a missing guard.
5. **Graduating fog is modelled as its own session.** It may belong inside the map session that
   resolved the last ticket, as wayfinder does it today.
6. **The event log is small.** 11 to 16 entries per full run, which is a reasonable size for
   one tracker comment per transition (#304).
