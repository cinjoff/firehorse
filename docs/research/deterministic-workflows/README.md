# Deterministic workflows: what "Goodbye Slop; Welcome Determinism" means for Firehorse

This note looks at what David Khourshid's 2026 talk implies for how Firehorse workflows hold
their shape. It asks what could make them more resilient and more deterministic, and which of
those mechanisms run on a Claude Pro or Max subscription rather than on a pay-per-token API key.

**Window:** researched 2026-09-27.

**Sources, and the gaps in them:**

- **The talk.** youtube.com, gitnation.com and stately.ai were blocked from this container, so
  there is no transcript. Its content comes from the published abstract and from search
  snippets.
- **His code.** The mechanisms he is building come from the READMEs and docs of the public
  repos under `github.com/statelyai`, which could be read.
- **Claude Code.** Hook behaviour was read from `code.claude.com/docs/en/hooks.md`. Subscription
  terms were read from the Claude help centre.

**Status:** a design study. Nothing here is a plan of record. The decisions it raises belong to
the wayfinder map charted from it.

## The talk

"Goodbye Slop; Welcome Determinism" was given at Beyond the Prompt in London (mid-2026) and at
Agent Conf 2026 in Warsaw (17–18 September, video `1rMgw0Q5MgY`).

**Confirmed from the abstract and the organisers' posts:**

- **What it pushes back on.** "Elaborate agent architectures, 'prompting astrology', overnight
  automation loops burning through context windows and credit cards."
- **The claim.** "Determinism, state machines, and explicit guardrails are the only sustainable
  way forward."
- **The diagnosis.** The root problem is not hallucination or bad prompts. It is
  **unstructured delegation**: an agent is handed a task without a model of what we want, fills
  the gaps with whatever fits, and the assumptions compound "until the thing is quietly broken."
- **The remedy.** Model the behaviour explicitly, as states, events and effects, before
  delegating.
- **The goal.** A **living spec** that includes state machines, iterated against an
  AI-generated implementation "until reaching equilibrium, where the app provably does what
  the spec says."
- **One nuance.** Agents that can modify their own workflows can beat rigid pipelines.

**Inferred from the library he was shipping at the same time.** This is `@statelyai/agent` v2,
`next` branch, last commit 2026-09-19. Its tagline is **"Make invalid agent actions
impossible."** Its techniques:

| Technique | What it means |
|---|---|
| The machine owns control flow; the model only picks a legal event | Each state declares `allowedEvents`. The model proposes one, and anything else is rejected and retried (`maxRetries`, then `onError`) |
| Guards live in code, not in the prompt | Code checks the rule on the transition (the README's refund example checks `amount <= 100`), whatever the prompt says |
| Tools are scoped to a request | "The machine decides when a request runs. The model picks which tools to call. The host executes them" |
| Outputs are schema-validated | Output that fails its Zod schema is rejected before the machine sees it. A separate validate-and-repair loop has a round cap held in the machine |
| An append-only event log is the source of truth | `replay` gives crash recovery, forking and time travel. Waiting on a human is a resumable wait state, not work |
| Deterministic tests | Scripted executors run the whole machine with no model at all. `lintAgentMachine` and `canReach` check reachability |
| The "thinking in state machines" heuristics | "A boolean flag is a state named as an adjective." "A string verdict is an event set." "A counter compared to a constant is a guard." "A blocking await on a person is a wait, not work" |

Related repos: `statelyai/skills` (keeps code, docs and diagrams in sync as a living source of
truth), `statelyai/schema` (a JSON statechart format with guards, timeouts and retries that an
LLM can author as data), and `statelyai/sketch` (a visualiser).

"Deterministic core, agentic shell" is **not** his phrase. It is Dave Mosher's, from February
2026.

## Where Firehorse already is

Firehorse already practises half of the thesis in prose. Nothing enforces the other half.

**Already practised:**

| Concept | Firehorse today |
|---|---|
| States and transitions | Each workflow's `## Handoff` is a hand-written transition table. `map` → `spec` → `tickets` → `build` → `ship` is fixed by D-181, with guards such as "no open children", "gate red" and "never offer build for a map child" |
| Explicit model before delegating | Wayfinder maps, specs and tickets are exactly this. They answer "unstructured delegation" |
| An event log as the source of truth | The tracker, plus git (D-182: no position on disk; position is derived) |
| Step postconditions | `→ Done when:` on every procedure step |
| Build-time checks | The parser requires the sections (D-180), and `definitions:check` catches stale mirrors |

**Not enforced:**

- Validation checks that headings exist. It never parses Handoff, Safety Gates or
  `Done when`, so the transition table is unverified and unreachable routes are invisible.
- Every guard is advice the model reads. Nothing stops `/firehorse:build` from closing a
  ticket with a red gate, and nothing stops a session from resolving two wayfinder tickets.
- The only Stop hook is a probe behind `FIREHORSE_NEXT_PROBE=1`.

**Binding constraints:**

- **D-25:** definitions are "declarative authoring contracts, not execution graphs".
- **D-138 and D-147:** allow narrow deterministic helpers, but "not a generalized workflow
  execution engine".
- **D-182:** no session position on disk.
- **AGENTS.md:** no runtime or hook "until that work is explicitly scoped".

A statechart used as a *checked contract* sits inside D-25. A statechart used as an
*interpreter* that drives Claude does not, and would need a new decision.

## What enforces determinism on a subscription

Every mechanism in the first four rows runs inside an interactive Claude Code session and
draws only on the normal subscription limits. No API key is involved.

| Mechanism | What it can enforce | Auth |
|---|---|---|
| `PreToolUse` hook | Deny an illegal action (`permissionDecision: "deny"` or exit 2), for example a merge from `/build` or an edit to a generated mirror | Subscription, in-session |
| `Stop` / `SubagentStop` hook | Refuse to end a turn: `decision: "block"` plus `reason` makes Claude continue. `stop_hook_active` and a continuation cap bound the loop. This is the validate-and-repair loop with the round cap held in code | Subscription, in-session |
| `type: "prompt"` / `"agent"` hooks | A model-judged guard ("does the diff satisfy the ticket") with no SDK and no key. Haiku is the default | Subscription, in-session |
| Permission rules, subagent `tools` / `disallowedTools`, skill `allowed-tools` | Per-phase tool scope: the machine decides which tools exist in each state | Subscription, in-session |
| Workflow scripts (Claude Code's JavaScript orchestration: `agent()` with `schema`, `pipeline`, `parallel`, resume) | Real code-owned control flow, schema-validated agent outputs, resumable runs. The closest in-product match to "the machine owns control flow" | Subscription, in-session; the user opts in per run |
| `claude -p` headless, `--json-schema`, `--resume`, `--allowedTools`, `--permission-mode dontAsk` | An external driver (for example an XState machine) invoking one Claude step per state | Subscription login works. Since 2026-06-15, `claude -p` and Agent SDK usage draw on a **separate monthly Agent SDK credit** (Pro $20, Max 5x $100, Max 20x $200, per user, no rollover), not on the interactive limits |
| Claude Agent SDK | The same as above, in code | Personal and own-project use draws on that same credit. Third-party products may not offer claude.ai login; those need an API key |

Two corrections to earlier notes in this repo:

- `hook-surface.md` warns that `additionalContext` on `Stop` restarts the turn. That is still
  true, and it is exactly the property a *completion guard* wants, as opposed to a
  next-action banner.
- The hooks reference lists `decision: "block"` as the documented way for `Stop` to force
  continuation (hooks.md, decision-control table).

## Candidate moves, cheapest first

1. **Parse the transition table.** Give `## Handoff` (and `Done when`) a structured form the
   parser reads: states are workflows, events are outcomes, and each guard names its evidence.
   `definitions:check` then lints reachability, catches routes to a missing workflow, and bans
   forbidden edges such as map child → build. This is the `lintAgentMachine` / `canReach`
   analogue, it runs at build time, and it stays within D-25.
2. **Guards in code, not in the prompt.** A plugin `Stop` command hook that derives the
   current state from git and the tracker, checks the evidence the finishing workflow's guard
   names (gate green, resolution comment present, one ticket closed), and blocks with a reason
   when it is missing. It fails open and is bounded by `stop_hook_active`. This is stage 2 of
   `next-action-hook/design.md`, re-aimed from advice to enforcement.
3. **Illegal actions impossible.** `PreToolUse` deny rules per phase: no merge or release
   outside `/firehorse:ship`, no write to a `firehorseGenerated` file, no second
   `gh issue close` on a wayfinder map in one session.
4. **Schema-validated handoff.** The workflow ends with a machine-readable handoff line
   (JSON) that the Stop hook validates. That is the "model proposes an event" half: the model
   names the event, and the hook checks it is legal from the current state.
5. **Deterministic evals.** Replay the transition table with scripted outcomes (no model) in
   vitest, and pair with `EVALUATION-FRAMEWORK.md` trials for the model-judged parts.
6. **An orchestrated run, only if 1–5 fall short.** Either a shipped Workflow script for
   `build`, or an external XState driver over `claude -p`. The second spends the Agent SDK
   credit and needs a decision superseding D-25 and D-138.

**Overlaps with open maps:**

- [#252](https://github.com/cinjoff/firehorse/issues/252) owns the next-action
  recommendation (advice).
- [#122](https://github.com/cinjoff/firehorse/issues/122) owns what "done" means.
- [#192](https://github.com/cinjoff/firehorse/issues/192) owns routing decisions to a System
  One model.

This effort is the **enforcement** layer they all lack. It should consume their rulings, not
remake them.

## Sources

- https://www.youtube.com/watch?v=1rMgw0Q5MgY (blocked here)
- https://gitnation.com/contents/goodbye-slop-welcome-determinism (abstract, via search)
- https://www.ag-grid.com/session/goodbye-slop-welcome-determinism/ (abstract, via search)
- https://github.com/statelyai/agent: `readme.md`, `docs/thinking-in-state-machines.md`,
  `docs/validate-and-repair.md`, `docs/tools.md`
- https://github.com/statelyai/skills, https://github.com/statelyai/schema,
  https://github.com/statelyai/sketch
- https://blog.davemo.com/posts/2026-02-14-deterministic-core-agentic-shell.html
- https://code.claude.com/docs/en/hooks.md (decision-control table; Stop decision control)
- https://code.claude.com/docs/en/headless.md, https://code.claude.com/docs/en/sub-agents.md,
  https://code.claude.com/docs/en/permissions.md
- https://support.claude.com/en/articles/15036540-use-the-claude-agent-sdk-with-your-claude-plan
