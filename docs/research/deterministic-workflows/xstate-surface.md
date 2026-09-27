# Orchestrator surface: `@statelyai/agent` v2 vs plain `xstate` v5

**Question.** An optional orchestrator drives a fixed route (map → spec → tickets → build →
ship). Each step sends a prompt to an interactive Claude Code session (created via Superset)
and waits for its outcome, which can take hours. Which surface should it be built on?

**Window:** researched 2026-09-27. Firehorse was at `142de0e` at the time.

## Sources

| Source | Version / SHA |
|---|---|
| `github.com/statelyai/agent`, branch `next` | `8d76df977e3004a7a8d0b1804d30859d2c120e34` (2026-09-19). `package.json` says `2.0.0-alpha.25` |
| `npm view @statelyai/agent` | dist-tags `latest 1.1.6`, `alpha 2.0.0-alpha.25` (published 2026-09-17), `next 2.0.0-next.5` |
| `npm view xstate` | dist-tags `latest 5.33.2` (2026-09-15), `alpha 6.0.0-alpha.60` (2026-09-26). The first v6 alpha, `6.0.0-alpha.1`, was published 2026-06-20 |
| Probes run locally | Node v22.22.2. The first probe used `@statelyai/agent@2.0.0-alpha.25` with `xstate@6.0.0-alpha.60`, the second used `xstate@5.33.2` |

Unless noted, file paths below are relative to the agent repo at `8d76df9`.

## Summary table

| Concern | `@statelyai/agent` 2.0.0-alpha.25 | `xstate` 5.33.2 |
|---|---|---|
| allowedEvents + rejection/retry | Built in, for **model decisions** only (`agent.decide`) | Build it yourself: `snapshot.can(event)` and a loop |
| Custom long-running step | Any XState actor via `runAgent({ actors })`. A child that is still running blocks settling; model it as start, then an idle wait | Same actor model: `fromPromise`, then a wait state |
| Durable log / replay | Write-ahead `AgentEventLogStore`, `replay`, `forkEventLog`, hash verification | None. Only `getPersistedSnapshot()` and a restore |
| Idempotency keys | `info.callKey`, for **model executors only** | None |
| Human / external wait | Idle settle + `isIdle` predicate + `meta.interaction` | A plain state. The host decides it is resting |
| Lint / reachability | `lintAgentMachine` (3 agent-specific rules), `canReach`, `explorePaths` | `xstate/graph` (`getShortestPaths`, `getSimplePaths`, `createTestModel`) |
| Model-free testing | `simulateAgent`, `createScriptedExecutors` | Pure `transition`/`initialTransition`, stub actors via `.provide` |
| LLM / Vercel AI SDK dependency | None. `ai` and `openai` are **optional** peers. Executors are plain functions | None |
| Licence | MIT | MIT |
| Install weight | 4 packages, 7.5 MB (`@statelyai/agent`, `xstate@6 alpha`, `saxes`, `xmlchars`) | 1 package, 2.7 MB, zero deps |
| ESM / Node | ESM + CJS. **`engines.node >=22.18.0`** | ESM + CJS. No `engines` field |
| Stability | Alpha, 25 alphas, many breaking renames. **Requires XState v6 alpha** | Stable (5.0.0 was 2023-12-01) |

## 1. allowedEvents, rejection and retry

- `agent.decide` takes `allowedEvents`: exact types or wildcards. The type checks them against
  the machine's event schema (`docs/decisions.md:26,53,57`).
- The candidate set is `allowedEvents` intersected with the events the state accepts. After
  the model picks one, `snapshot.can(event)` checks it. A guard rejection counts as a failed
  attempt, and the model is asked again (`docs/decisions.md:101`).
- `maxRetries` defaults to 2, so there are at most 3 attempts (`src/decision.ts:170,587-627`).
  When the retries run out, the run throws `AgentDecisionExhaustedError`, and `runAgent` reports
  it as `cause: 'decision-exhausted'` (`src/run-agent.ts:590-593`).
- `maxModelCalls` defaults to 100 and caps the whole run (`src/run-agent.ts:571-579`).
- **Scope.** This machinery applies to the `decide` executor, a model choosing an event. It does
  not apply to a host event sent into a waiting state. An unhandled host event is not rejected:
  it is ignored and reported as `result.ignored` (`docs/persistence.md`, "Resume with an event
  off the wire").
- **In xstate v5 (probe):** `snapshot.can({type:'FOO'})` returned `false`, and sending it left
  the state unchanged. Candidate events can be listed with
  `__unsafe_getAllOwnEventDescriptors`. The decision retry loop is about 20 lines of host code.

## 2. Custom executors and hours-long, restart-surviving steps

- **Executors are for model requests only.** There are three slots: `generateText`,
  `streamText` and `decide`, each `(request, info) => result` (`docs/hosts.md`;
  `RunAgentOptions.executors`, `src/run-agent.ts:441`).
- **A non-model step is an ordinary XState actor.** It is passed through
  `runAgent({ actors })`, which is sugar for `machine.provide` (`src/run-agent.ts:511-513`).
- **An actor that is still running holds the run open.** `runAgent` settles `idle` only when
  no child is in flight (`isIdleSnapshot`, `src/run-agent.ts:2948-2965`). An actor that awaits
  a session for hours therefore pins the process for hours.
- **The pattern that survives a restart** is start, then wait:
  1. An async actor starts the Superset session and returns the `sessionId`. That completion is
     journaled as `xstate.done.actor`.
  2. The machine enters a wait state tagged, for example, `awaiting-session`, and
     `setupAgent({ isIdle })` treats it as idle.
  3. A webhook or poller later calls `runAgent({ store, threadId, event: {type:'SESSION_DONE'} })`.
- **Verified by probe** (`probe.mjs`, agent alpha.25):
  - Run 1 settled `idle` in `mapWait`. The log was `['@agent.init','xstate.done.actor']`.
  - Run 2 resumed from the store with `SESSION_DONE` and reached `done`. The session start was
    not re-executed.
- **A crash mid-start re-runs the start.** The probe aborted a run while the start actor was
  in flight. The log held only `@agent.init`, and resuming ran the start actor again: at-least-once
  (`docs/persistence.md`: "A request that was in flight … re-executes").
- **`callKey` is not passed to custom actors.** It is minted only for text and decision
  executors (`src/run-agent.ts:1209,1286,2472-2500`). A Superset start therefore needs its own
  idempotency key, such as `threadId:state:attempt`, read from context.
- **In v5 (probe):**
  - A snapshot taken mid-invoke persisted the child as `{status:'active', input}`.
  - Restoring it re-ran the promise, so v5 is also at-least-once.
  - A snapshot taken in the wait state restored cleanly and accepted `SESSION_DONE`.
  - The start-then-wait shape works the same way.

## 3. Event log, replay, persistence, idempotency, human waits

- **What the log journals.** Only external inputs: `@agent.init`, host events, child
  `done`/`error` with the output inline, timers and `@agent.usage` (`docs/event-log.md`).
- **`store` is write-ahead.** Entries are appended with optimistic concurrency
  (`expectedIndex`), and each model call awaits them first. A write conflict settles the run as
  `cause:'journal'` (`docs/event-log.md`, "Record a log").
- **No durable store ships.** Only `createInMemoryEventLogStore` is included, plus a conformance
  suite for stores you write yourself. An earlier `@statelyai/agent/sqlite` store existed and is
  no longer in the exports (`CHANGELOG.md:809`; `package.json` exports).
- **`replay` is a pure fold.** It checks `verification.stateHash` as it goes. A snapshot is only
  a cache over the log (`docs/persistence.md`).
- **Versioning.** A machine carries `version` and `migrate`. Changing the version starts a new
  log segment.
- **Human waits.** A state that is resting and has handlers settles `idle`. `getInteraction`
  and `eventFromInteraction` render the wait and validate the answer
  (`docs/human-in-the-loop.md`).
- **The roadmap puts durable execution upstream.** Durable execution and effect recovery belong
  in "XState / `xstate/durable`" (`docs/roadmap.md`). `xstate@6.0.0-alpha.60` does export
  `xstate/durable` (`createDurable`, `DurableExecutionResumeError`). It has no v5 counterpart.
- **v5 has persistence only.** `actor.getPersistedSnapshot()` plus
  `createActor(machine, { snapshot })`. It has no log, no replay, no store interface and no key.

## 4. `lintAgentMachine`, `canReach`

- **`lintAgentMachine` has three rules** (`docs/verify.md`):
  - `decide-without-events` (error)
  - `invoke-without-on-error` (warning)
  - `direct-object-src` (warning)

  General statechart lint is left to XState tooling (`docs/debugging.md:27`).
- **`canReach(machine, target, script)`** returns `{reachable, witness}` and respects guards.
  **Probe:** it returned `reachable:true`, `witness:[SESSION_DONE]`, for `route.spec`, but only
  after `machine.provide({actors})`. Without that it threw
  `Actor logic 'startSession' not implemented`.
- **v5 has graph utilities instead.** `xstate/graph` exports `getShortestPaths`,
  `getSimplePaths`, `createTestModel` and `getAdjacencyMap`, which give path and reachability
  checks, but no agent-specific lint.

## 5. Model-free testing

- **`simulateAgent`** plays scripts keyed by invoke src, on channels `decisions`, `text`,
  `invokes`, `errors` and `events`. Its statuses are `done`, `idle` and `exhausted`
  (`docs/verify.md`, "Scripted playthroughs"). The probe reached `done`.
- **`createScriptedExecutors`** drives the real `runAgent` path with canned answers
  (`docs/evals.md`).
- **In v5** you stub actors with `.provide`, and the pure functions `transition` and
  `initialTransition` step the machine without an actor.

## 6. Model coupling (Jev must be pluggable)

- **No runtime dependencies.** The package has no `dependencies` field. `ai`, `openai`, `ajv`
  and `@opentelemetry/api` are all optional peers (`package.json`; `npm view`).
- **No provider is imported by core.** "Core does not import or require the AI SDK at runtime"
  (`docs/hosts.md`). The probe ran with `executors: {}` and no provider installed.
- **Jev fits the `decide` slot.** The executor is a plain function returning
  `{ event: { type } }` (`readme.md` quick start).
- **v5 is equally model-agnostic.** Jev would be a `fromPromise` whose result the host checks
  with `can()`.

## 7. Licence, weight, ESM, Node

- **Licence.** Both are MIT (`LICENSE`: "Copyright (c) 2025 Stately Software, Inc."; `npm view`).
- **Weight.** Measured with `npm i`:
  - Agent plus v6: 7.5 MB across 4 packages. xstate v6 depends on `saxes`, which depends on
    `xmlchars`.
  - v5: 2.7 MB, 1 package.
  - Unpacked sizes: agent 1.23 MB, xstate@5.33.2 2.31 MB, xstate@6 alpha 5.61 MB.
- **Module format.** Both ship ESM and CJS.
- **Node 20.**
  - Agent declares `engines.node >=22.18.0`, a leftover from the removed `node:sqlite` store
    (`CHANGELOG.md:809`), and its README says Node 22.18+.
  - Its `src` has no `node:` imports outside tests, but it was not run on Node 20 here.
  - Firehorse declares `"node": ">=20"`, so the agent is outside its supported range.
  - xstate v5 declares no engines constraint.

## 8. API stability

- **Agent.** The README and every docs page say "APIs may change … pin an exact version." Over
  25 alphas the changelog records repeated breaking renames. Examples:
  - The `isSuspended` predicate became `isIdle`.
  - `WAIT_TAG` was removed.
  - The error classes were renamed.
  - `@statelyai/agent/zod` and `/openai-compat` were removed.
  - The executor result shapes changed.

  See `CHANGELOG.md` lines 23-29, 92, 241-243, 501, 683 and 739.
- **The agent peers on `xstate >=6.0.0-alpha.57 <6.0.0`**, and v6 renames core APIs. The probe
  found that `fromPromise` does not exist in v6: it is `createAsyncLogic({ run })`.
- **XState versions cannot mix in one package** (`docs/xstate-4-and-5-apps.md`).
- **XState v6 is still alpha.** There are 60 alphas since 2026-06-20 and no release date.
  `latest` remains 5.33.2.

## Recommendation: plain `xstate` v5 (5.33.2), with agent v2's patterns copied rather than depended on

**The facts it rests on:**

1. **The long step is not a model call.** In the agent, `allowedEvents`/`decide`, `callKey`,
   scripted executors and `maxModelCalls` all cover model requests. A Superset session is a
   custom actor on both surfaces, and it gets no `callKey` in the agent either
   (`src/run-agent.ts:1209,1286`).
2. **Surviving a restart comes from how the machine is shaped, not from the library.** On both
   surfaces the machine starts the session, then waits: a short start actor, then a wait state
   resumed by an external event. Both re-run an in-flight actor on resume (probes above). The
   host has to supply the idempotency key either way.
3. **v5 is stable, has zero dependencies and fits Node 20.** The agent needs a prerelease XState
   v6 and Node ≥22.18, and has broken its API from one alpha to the next.
4. **What firehorse would lose is small for a linear route.** It would lose a write-ahead log
   with replay. Persisting `getPersistedSnapshot()` at each wait state, which is the only point
   where the process rests, covers a linear route. `snapshot.can()` gives
   rejection. `xstate/graph` gives reachability.

**What to copy from agent v2:**

- Keep context JSON-safe.
- Resume each wait state from a tagged idle state.
- Derive a `threadId:step:attempt` key for session starts.
- Retry a rejected Jev decision up to a cap, then take `onError`.
- Journal external events yourself if audit is needed.

**When to revisit:** once XState v6 and `@statelyai/agent` 2.0 are stable, and if firehorse
moves to Node 22. At that point the log and `store` would replace hand-rolled snapshot storage.
