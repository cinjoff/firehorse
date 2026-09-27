# Route prototype (#307)

This is a throwaway prototype, deliberately not a workspace package. It models Firehorse's route
(`map → spec → tickets → build → ship`) as a **plain XState v5** machine (`xstate` 5.33.2, MIT, no
dependencies). Sessions, Jev and the person are all scripted.

```sh
npm install        # Node >= 20
node route.mjs     # all four scenarios
node route.mjs red-gate
```

The first version used `@statelyai/agent`. The user then ruled for plain `xstate`, and this
port keeps the patterns without the library. Its findings are kept below, because they carry over.

## What it models

| Ruling | Where it lives in `route.mjs` |
|---|---|
| A step is a Superset session, then a wait (#298, #304) | `session()` invokes `startSession` and lands in a `*Wait` state tagged `awaiting-session`. The host exits there and is woken by `SESSION_DONE` |
| A short-lived host (#304) | Every wake restores the JSON-persisted snapshot, checks `snapshot.can(event)`, sends one event, runs to the next wait, persists and stops |
| Code decides the checkable transitions (#305) | Named guards in `setup()`: `frontierOpen`, `allBlocked`, `wayClear`, `gateGreen`, `canRetryBuild` |
| Jev picks among the legal events (#305) | `mapFogJudgement` invokes `decide`, which returns `{ type, p }`. The `jevPicked` guard takes a pick only if it is one this state accepts **and** `p ≥ 0.8`. Anything else, or an error (no key), goes to a person |
| The fallback is a person, offered today's `▶ Next` options (#305) | The `mapFogHuman`, `gateRedHuman` and `mapBlocked` states, each tagged `awaiting-human` with `meta.label` and `meta.options` |
| The gate is re-run, never read from prose (#299) | The host re-runs the gate after a build session and sends the result as evidence |

In plain v5, a decision model is just an invoked promise actor that returns its pick. The legal
event set is the `onDone` guards: code, readable in one place. This needs no `agent.decide`.

## What it showed

1. **Guards must read only what arrived in an event.** The `@statelyai/agent` version read the
   tracker live from inside its guards, and a resume threw `AgentReplayDivergenceError`.
   Here, the host gathers the evidence (frontier, fog, gate) and sends it as the `SESSION_DONE`
   payload, and guards read only `context`. **Ruled (Q4): the outcome line plus the host's
   confirmation becomes the event payload. Nothing reaches a guard any other way.**
2. **A run starts once.** `input` is passed only on the first wake. Every later wake restores
   the persisted snapshot.
3. **`map/ticket/step` is not unique enough.** Build retries collided on one key. The port
   adds the attempt number (`#n`). **Ruled (Q1): a retry is a new session keyed
   `map/ticket/step#n`, never a follow-up typed into the old one.**
4. **Build has no slice.** After `tickets`, build runs once. The real route loops
   `build → ship` per slice. That is a missing state, not a missing guard. **Ruled (Q2): a slice
   loop. `tickets` reports the slice list as evidence, and slices run in blocking-edge order,
   tracer bullet first. A red slice waits on a person without halting independent slices.**
5. **Graduating fog is modelled as its own session.** **Ruled (Q3): it happens inside the map
   session that resolved the last ticket, as wayfinder does. Jev's `GRADUATE_FOG` re-enters the
   map step, and there is no separate graduate session.**
