# Prior art: software factories that gate coding-agent work with Jev

**Question:** who is building "software factory" or coding-agent orchestration setups that use
Jev to gate or route agent work, and how do they structure it? The lens is Firehorse's own
design: an orchestrator that drives a fixed route of coding-agent sessions, guards owned by
code, a decision model that picks among the legal next actions, and a person as the fallback.

**Researched:** 2026-09-27. **Window:** 2026-08-28 to 2026-09-27, with emphasis on
2026-09-20 to 2026-09-27, the week after `docs/research/jev/` was frozen.

**Method:**

- **Starting point.** `docs/research/jev/` (catalog to 2026-09-20; `use-cases.md`, agentic
  cluster) and `docs/research/next-action-hook/foreman-gates.md`.
- **Cloned and read at HEAD on 2026-09-27.** `thruwire/foreman` and the 18 other repos named
  below.
- **Discovery.**
  - GitHub repository search (`jev created:>2026-09-19`).
  - WebSearch.
  - `npm search typesafe jev`.
  - The `DansiDanutz/awesome-jev-typesafe` index.
- **Stars.** From the GitHub search API on 2026-09-27.

**Blocked:** `docs.typesafe.ai` (egress proxy), so TypeSafe's own "coding agents" page was not
read. X posts were seen only as search snippets.

**Markers:**

- **[C] Confirmed.** Read in the repo's source, docs or commit messages.
- **[I] Inferred.** Deduced from structure, or read only in a search snippet or PR summary.

---

## Ranked projects

Ranked by how closely each one matches Firehorse's shape: a fixed route of sessions, guards in
code, a model choosing among legal moves, and a human fallback.

### 1. stratonext/software-factory: YAML pipelines with a Jev judge stage

<https://github.com/stratonext/software-factory>

- **Stars and activity.** 9 stars. Created 2026-09-21. 55 commits, last 2026-09-23 (v0.0.3 on
  PyPI).
- **Catalog.** Not in the 2026-09-20 catalog.

**What it orchestrates [C].** A local queue of requests. Each request walks one pipeline: a
YAML file of stages, each with `uses: claude | shell | typesafe`. It runs in its own git
worktree and branch (`~/.sf/worktrees/<repo>/<id>/`). A daemon polls the queue under a
concurrency quota. The README's framing is Firehorse's own: "The agent you are talking to is
the foreman, not the worker… the foreman is never the one grading its own diff, because the
pipeline decides that with a test run or a Jev judgment."

**Where Jev sits [C]:**

- **A stage.** `uses: typesafe` is a stage in its own right, not a hook. A judge file declares:
  - `state:`, as shell commands whose stdout becomes named fields (`diff: "git diff"`).
  - `questions:`, as `noul`, `score` and `choice` items.
  - An ordered `route:` where the first matching rule wins, returning only `pass`, `fail` or
    `human` (`docs/pipelines.md` §judge, `software_factory/judge.py`).
- **The shipped gate** (`.sf/pipelines/prompts/human-review.yaml`). It asks four nouls:
  `destructive`, `scope`, `stubbed` and `implements`. Its rules:
  - `destructive > $destructive` → human.
  - `scope > 0.8` → human.
  - `implements < $implements` → fail, which is rework back to `code`.
  - `stubbed > $stubbed` → fail.
  - `implements confidence_below: 0.5` → human.
  - Otherwise pass.
- **Thresholds are named and central.** `$name` values live in `~/.sf/config.yaml`
  `typesafe.thresholds`, with defaults secret 0.5, destructive 0.6, implements 0.5, scope 0.8,
  satisfied 0.6, stubbed 0.6. An undefined `$name` parks the request. It is "never read as
  zero".
- **Triage at submit.** `--pipeline auto` and `--effort auto` ask Jev which pipeline a request
  belongs in, choosing only among pipelines that carry a `description:`. Below
  `min_confidence` 0.6 the configured default wins. Below `vague` 0.35 the request is flagged
  as too vague.

**Fallback [C].** No key, an HTTP error, or an unanswered question returns `human` and parks the
request: "a service it could not reach is a decision nobody made". Any stage, including an
agent, may return `human` itself. `review: true` parks after a stage whatever it returned.
`max_passes` counts rework before a human is asked instead.

**State and evidence [C].** Gathered by the judge's own shell commands at the moment it runs, not
narrated by the agent. The notes record the number that fired
(`secret 0.71 > 0.5 - possible hardcoded credential`).

**Persist and resume [C]:**

- One JSON file per request, written atomically, with "no database".
- `sf replay <id>` plays back every step, its route and its artifacts.
- `sf run <id> --note "…"` answers a parked request, and `--stage` re-enters an earlier stage.
- Agent stages resume their Claude session by default (`resume: true`). The review stage opts
  out, so a reviewer never continues the coder's session. "The record, not the session, is the
  truth" (`docs/internals.md`).

**State machine [C].** Self-described as "a state machine with agents in the boxes, a disk to
remember, and a human escape hatch". It is "a state machine with counted rework, not a DAG — the
backwards edges are the whole design". `if:` is deliberately left out because "the `on:` verdict
edges *are* the conditional". It is hand-rolled, with no XState.

**Runtime [C].** The `claude` runner is
`claude -p … --output-format json --permission-mode bypassPermissions`, with auth through
`claude setup-token` and `CLAUDE_CODE_OAUTH_TOKEN` ("needs a Claude subscription").
Inferred [I]: under the 2026-06-15 terms that draws on the separate Agent SDK/`-p` credit, not
on interactive limits (see `README.md` in this directory).

**Numbers [C].** Twelve `quick` runs (code then commit, no Jev) cost $1.89 / $4.54 / $9.57
(cheapest, median, dearest) and took 2m24s to 11m56s. A judgment is quoted at about $0.0002. No
accuracy figures for the judge.

### 2. thruwire/foreman, re-read: now responsibilities, routing, hooks and extensions

<https://github.com/thruwire/foreman>

- **Stars.** 589, up from 415 on 2026-09-20.
- **Activity.** 11 commits since the 2026-09-20 read (PRs #16 to #34), last 2026-09-27.
- **Size of the change.** `git diff --stat a7d21d1 HEAD`: 63 files, +8,177/−397.

**What changed since `foreman-gates.md` [C]:**

- **The ten gates became six responsibilities (#16).** Each is a TOML file under
  `src/foreman/responsibilities/definitions/` that owns its checks and thresholds:
  `core.completion`, `core.verification`, `core.human-escalation`, `core.worker-health`,
  `repository.instructions` and `quality.documentation`. A Python class owns the directive
  logic. `min_threshold` sits beside each check. The values match the old policy:
  needs_human 0.80, worker_stuck and off_track 0.80, agents_md_drift 0.80, completion trio
  0.75, needs_verification 0.65.
- **`policy.py` is now 106 lines of arbitration, not a threshold ladder.** Each
  responsibility *proposes* directives with a priority, and policy picks
  `max(priority, confidence)`:
  - ESCALATE on needs_human: 1000.
  - Iteration limit: 950.
  - Steer or stop: 900.
  - Retry: 800.
  - Start worker: 750.
  - Finish: 700.
  - Verify: 600.
  - Worker: 500.

  Runtime guardrails then override. A retry past `max_retries` or `max_workers`, or a
  verifier with no worker slot, becomes ESCALATE. All proposals are recorded along with the
  one selected. This is the "legal action vocabulary owned by code" idea, made pluggable.
- **Central routing (#18).** Before the first worker, global responsibilities are always
  active. All conditional ones go to Jev in one `system_one` call, and every one at or above
  its `routing_threshold` activates (documentation: 0.70). The decision is persisted as
  `FOREMAN_ROUTED`. Malformed routing output fails before any worker starts.
- **Attached workers through hooks (#23).** `foreman hook --client <adapter>` handles a
  *human-started* interactive session:
  - `PreToolUse`: stop or escalate denies the tool, and steering becomes context.
  - `Stop`: at most one automatic continuation, bounded by `stop_hook_active`.
  - State lives in `~/.foreman/sessions/<sha256>.json`, never in the repo.
  - Only a `codex` adapter ships. A Claude Code adapter would be "a new adapter and registry
    entry, not another supervision runtime".
- **Extensions (#24).** Namespaced responsibility plugins and hierarchical route groups, for
  example project → responsibilities with `best_match`. Hooks never sync over the network;
  they read a local snapshot, and a changed snapshot mid-session forces the prompt to be
  resubmitted.
- **More evidence (#27, #28).**
  - Pytest summary lines are parsed from worker output into `test_results`.
  - Bounded content of untracked files (3 files, 4 KiB) is included, because `git diff`
    misses new tests.
- **Workers.** OpenCode (#9) and Hermes (#33) backends, both stop-and-retry only (no live
  steering).
- **Thresholds were loosened after smoke tests (#4, 2026-09-19).** `finish` went 0.85 → 0.75
  and `requirements` 0.80 → 0.75, pinned by a test that uses one real observed answer set
  (implementation_complete 0.77, requirements_satisfied 0.79, tests_sufficient 0.92, …).

**Open PR #25 [C, via PR page]:**

- **What it proposes.** A `decision-policy` responsibility with a `decision-required` check at
  a 0.70 floor, abstention categories, and "tighten-only" merging of thresholds.
- **The review objection.** Abstention mapped to `ESCALATE` is *terminal* in hook runtimes,
  which contradicts "never terminates the worker". The maintainer asked for a non-terminal
  human-routing contract first.

**Persist and resume [C].** `RunStore`: `state.json` (atomic replace) plus an append-only
`events.jsonl`. `docs/what-foreman-proves.md` says the timeline exists so "threshold changes can
be replayed, and false positive/negative interventions can be counted". It still publishes no
accuracy, and lists "that the default thresholds are calibrated" among the claims it does not
establish.

**State machine [C].** None. It is an asyncio policy loop over a fixed directive vocabulary.
**Runtime [C].** Codex App Server by default, Python, with a Jev API key.

### 3. damian87x/jev-claude-orchestrator: a Claude Code plugin in which workers never say "done"

<https://github.com/damian87x/jev-claude-orchestrator>

- **Stars and activity.** 0 stars. Created 2026-09-22. 12 commits, last 2026-09-27.
- **Distribution.** npm `jev-claude-orchestrator`. The README says v0.4.0; `npm view` shows
  0.3.1.

**What it orchestrates [C].** `/conductor-max <goal>`: the main session plans a DAG of up to 50
small slices. Each slice has acceptance text, a file allowlist and a gate command
(`jevo.py slice new --acceptance … --allow … --gate …`). Slice-worker subagents (haiku, sonnet
or opus) run in parallel worktrees, in waves.

**Where Jev sits [C].** Six question sets in `skills/conductor-max/references/jev-questions.json`:

| Set | Questions |
|---|---|
| `triage` | tier, risk, needs_human, shared_surface |
| `review_risk` | correctness, security, tests_missing, scope_drift |
| `review_verdict` | severity, verdict |
| `qa` | done, failure_kind |
| `health` | worker_stuck, off_track, meaningful_progress |
| `watch` | hung, progressing |

All policy is in `lib/stages.py`:

- **Triage.** Tier is the highest tier with p ≥ 0.25. Risk ≥ 2.5 sends review to a frontier
  model. needs_human ≥ 0.5 escalates. shared ≥ 0.5 runs the slice serially.
- **Review.**
  - security ≥ 0.5 escalates, and so do `escalate`, sev ≥ 2.5 or confidence < 0.6.
  - `fix`, sev ≥ 1.5 or scope_drift ≥ 0.7 send the slice back for a fix.
- **QA.** done ≥ 0.8 passes. `environment` or `flaky` at confidence ≥ 0.7 is routed
  separately.
- **Health.** stuck or off_track ≥ 0.7 steers.
- **Watch.** hung ≥ 0.7 unsticks the worker. Hung between 0.2 and 0.7 with a pending call is
  "unsure", which calls back to the conductor and never extends.

**Guards in code, re-run by code [C].** A `SubagentStop` hook re-runs the slice gate. Code vetoes
run *before* Jev, and Jev cannot override them:

- a nonzero gate exit, or parsed failure counts;
- files outside the allowlist;
- secret patterns in the diff;
- an oversized diff.

A failing slice has its stop blocked with a reason (`max_blocks` 2). A `PostToolUse` hook steers
every `health_every` (8) tool calls.

**Fallback [C]:**

- Any Jev error, timeout or malformed answer → `escalate`, never `approve`.
- Exit codes are uniform: 0 proceed, 1 fix, 3 escalate, 2 error treated as escalate.
- A local Polaris model serves as fallback for triage only. A fallback "can never approve a
  slice".
- Escalations go to a read-only `frontier-reviewer` or to the human. "A Jev approval never
  merges, pushes or deploys anything."

**Persist [C].** `.jev-orchestrator/` holds slices, a ledger and per-agent counters, and is
excluded through `.git/info/exclude`. There is an HTML scoreboard report. No state machine
library.

**Runtime [C].** Inside an interactive Claude Code session: plugin, skill, subagents and hooks,
so the subscription. Jev by API key.

**Numbers [C]:**

- A pre-registered test on 334 real packets (2026-09-27), against gold from the majority of
  three frontier models. The table below compares Jev with Polaris 3, the local fallback
  model.

  | Stage | Jev | Polaris 3 |
  |---|---|---|
  | Triage | 46.3% | 59.3% |
  | QA | **96.3%** | 34.1% |
  | Review | **9.5%** | 4.8% |
  | Health | **95.3%** | 21.5% |

- A live 2-slice run cost $0.00033 in Jev against $0.35 in Claude. The lazy worker's stop was
  blocked by a *code* veto, not by Jev. The main session's summary misreported the outcome:
  "trust the ledger, not the narration".

### 4. smithersai/smithers: durable workflows with a Jev brake behind deterministic ones

<https://github.com/smithersai/smithers>

- **Stars.** 422.
- **Activity.** Very high: 1,976 commits since 2026-09-20. Jev commits run 2026-09-17 to
  2026-09-26.

**What it orchestrates [C].** "The codebase maintainer agent": it turns issues into reviewed,
tested changes through TypeScript flows (Effect-based, durable, journaled, resumable). The
flows are defined in `.smithers/factory.json` with capabilities and budgets. The repo's
maintenance skill rules that "a decision inside a flow (classify, filter, rank, route, yes/no
over items) asks Jev… never through an LLM seat."

**Where Jev sits [C]:**

- **The completion-claim brake** (commit `68c6426`, 2026-09-18). It is the *sixth* brake,
  consulted only after five deterministic brakes found nothing (unmoved tree, displaced
  failing check, and others). Two questions:
  - Does the evidence show the task done? A probability ≤ 0.3 hands the frame back once
    (`claimCap` 1).
  - Does the claim assert what the evidence does not show? ≥ 0.8 does the same.

  The asymmetry is justified in the commit: "a false demand costs a run a frame, while a false
  pass costs nothing here, since the five brakes still ran". Every reading is journaled as
  `AgentEvent.ClaimDemanded`, whether it demanded or not. `b09c0b6` (2026-09-26) reads long
  claims one sentence at a time.
- **The session checker.** `jev.session` answers whether an agent session is *working, idle,
  or waiting on a person* from a 4 KiB output tail (`apps/app/docs/HEALTH.md`), through the
  Vercel AI Gateway (`typesafe-ai/jev`). There is no fallback model: an error reads as
  "unknown", never "healthy".
- **Per-hunk lint.** `flows/coding/jev-check.ts` judges rules against each diff hunk (at most
  8 rules and 256 questions). Its input is only the diff between the implementation's
  immutable parent and head, "so a resumed run judges exactly what the first attempt judged".

**Persist [C].** A SQL journal (`local-health.sqlite`, engine journal) and replayable evals
("replay exactly the snapshots and rule the live supervisor uses", `293110c`). No XState.
**Runtime [C].** Its own seats (Cerebras, Codex or Claude models) plus Jev through AI Gateway or
key. Not a Claude Code subscription driver.

### 5. clouatre-labs/agentic-coder-skill: an issue-driven fixed-phase pipeline with a "propose/validate" tier

<https://github.com/clouatre-labs/agentic-coder-skill>

- **Stars and activity.** 2 stars. Active; 9 commits since 2026-09-20.

**What it orchestrates [C].** The `coder` skill takes a GitHub issue through
SETUP → SCOUT → GUARD → PLAN → BUILD → CHECK, then a draft PR. Which phases run depends on the
tier: simple, medium or complex. Several issues run as one parallel session per issue, each with
its own worktree and a handoff directory under `.git/coder-handoffs/<session-id>/`.

**Where Jev sits [C] (v3.21.0, 2026-09-23).** The orchestrator *proposes* a tier by a
deterministic lookup over repo facts (file count, `git diff --stat`, docs versus code). One
`choice` call per session *validates* every proposal, with criteria
`confirm | promote | demote`. The answer is final and clamped to the tier ladder. Judge
unavailable → the proposal stands, logged with `fallback: true`. A separate handoff gate is
purely deterministic: a gzip compression ratio below 0.10 trips the retry policy.

**Issue #21 [I, via issue page; closed 2026-09].** It proposed moving the PLAN risk labels,
CHECK verdict routing (PASS / PASS WITH NOTES / FAIL) and PR-review triage to Jev, with
confidence < 0.6 or an error falling back to the LLM turn. Whether that landed is not verified.

**Numbers [C].** A case study (2026-09-19): 5 issues, 5 parallel sessions, 5/5 PRs merged,
1h42m, 23 subagent spawns, 3 human interventions. The README reports "2/13 as one mega-run".

**Runtime [C].** A skill for Claude Code and Goose. The judge runs through the
`decisions-judge-mcp` MCP server.

### 6. davesheffer/coding-orchestrator: hook-level routing and "deny once" gates

<https://github.com/davesheffer/coding-orchestrator>

- **Stars and activity.** 0 stars. Created 2026-09-22. 48 commits, last 2026-09-25.

**What it orchestrates [C].** An Opus orchestrator with four roles: scout, runner, builder and
critic. Every subagent must report `RESULT / EVIDENCE / CONFIDENCE / UNVERIFIED`.

**Where Jev sits [C]** (`./install.sh --jev`). Five hooks:

| Hook | Where | What Jev decides |
|---|---|---|
| `route` | PreToolUse Agent | The subagent's tier, which rewrites `updatedInput.model`. Thresholds are *directional*: up at 0.35, down at 0.8, `escalate_mass` 0.4 |
| `shift` | UserPromptSubmit | Is the prompt the same task? Below 0.25 it tells the model to roll over |
| `risk_gate` | PreToolUse Bash on commit or push | A risky commit with no critic run is **denied once**, and an identical retry proceeds |
| `report_check` | SubagentHandback | EVIDENCE that does not support RESULT is denied once |
| `handoff_grade` | Handoff | A score of 0–4. Below 2 it exits 3 without saving |

**Fallback [C].** "Everything fails open", with a hard 4 s deadline. The author calls
`risk_gate` "advisory, not enforcement" and lists the bypasses.
**Numbers.** There is a 30-task routing benchmark file (`benchmarks/jev-routing.json`) with no
published result. `docs/optimization-research.md` says end-to-end savings are "unverified".

### 7. qkal/Canny: "Facts go to code. Judgments go to Jev. Only facts can block."

<https://github.com/qkal/Canny>

- **Stars and activity.** 98 stars. 20 commits since 2026-09-20; v0.3.0 on 2026-09-23.

**Structure [C].** Claude Code and Codex hooks feed an append-only ledger in
`~/.canny/sessions/`. The Stop hook refuses "done" when a file changed and no check has passed
since the last edit. The ledger decides that, not Jev. Jev only asks "does this message claim
done?" and "does this edit break rule X?", and the answer becomes a note. When Jev is unsure,
the deterministic rule stands alone.

**Replay [C].** `canny replay` re-derives every Stop verdict from the recorded facts *and the
recorded Jev answers*, and reports any mismatch.

**Numbers [C].** A bench of 5 tasks with hidden checks. On a 25-pair Opus 5 run there were
25/25 passes in both arms, with no measurable overhead (1.6 ± 3.4 s faster). So no outcome
difference was shown on tasks the model already solves.

### 8. bastani-inc/atomic: DAG workflows in which code shortlists and Jev picks

<https://github.com/bastani-inc/atomic>

- **Stars and activity.** 834 stars. 228 commits since 2026-09-20.

**Structure [C].** A fork of Pi. A workflow is "issue or goal → research → plan → agent stages →
artifacts → checks → review gate". Cycles are forbidden: repair loops must create distinct
tracked work per iteration.

**Jev [C]** (commits `75dfcfb` and neighbours, 2026-09-24/25). Model routing works in two
requests. First, Jev answers fixed questions about the task: kind, difficulty, mistake cost,
image input. Then *code* ranks eligible models from `evals.md`, and Jev picks from a shortlist of
about six, each option carrying its own evidence. Fallbacks come from code's ranking. It is a
clean instance of "code enumerates the legal set, Jev picks".

### 9. dansya-arsana/jev-harness: the TypeSafe "Jev Engineering" blueprint as a Claude Code PoC

<https://github.com/dansya-arsana/jev-harness>

- **Stars and activity.** 0 stars. Created 2026-09-25.
- **Related npm package.** `@jev-harness/claude-code` 0.7.0 (2026-09-27) is a separately
  named, similar package; its link to this repo is unconfirmed [I].

**Structure [C].** It covers five pieces:

- a permission gate, where hard rules run first and only the unclear middle goes to Jev, and it
  never auto-approves;
- a prompt router for skills;
- conditional instructions;
- a dispatch router for effort-tiered subagents, which swaps tier only at depth ≥ 0.6 and never
  across the read/write boundary;
- context packs.

**Numbers [C]** (`docs/REPORT.md`):

- **Gate.** 64/64 on a held-out set, with 0/40 false denies.
- **Routing.** 47/50 acceptable.
- **Conditional instructions.** Precision 1.00, recall 0.92.
- **An overfitting warning.** A routing fix scored 90% on the reused set and 62% on a fresh one.

### 10. Alex314618-create/JevRev: JevLoop picks the next action from a fixed set

<https://github.com/Alex314618-create/JevRev>

- **Stars and activity.** 388 stars. Created 2026-09-21. 81 commits.

**Structure [C].** JevLoop "confirms the facts first, then asks Jev what the result still needs".
The next action comes from `fix | verify | continue | replan | human`. JevLong watches JSONL
events for stalls and drift. It runs over CLI and JSON and "leaves the session in the host
agent's hands".

**Numbers.** Showcase comparisons only, no accuracy.

### 11. blackswanalpha/bundlebox PR #64: a Foreman port

<https://github.com/blackswanalpha/bundlebox/pull/64>

- **Stars.** 2. Merged 2026-09-22.
- **Details [I, via PR page].** A port of Foreman's responsibility policy with seven actions:
  continue, steer, stop, verify, resume, finish and escalate. Without a key it falls back to
  git, drift and verification evidence. It keeps a timeline in
  `.bundlebox/var/foreman-timeline.jsonl` "for replay… against labeled outcomes".

### 12. Also relevant, in brief

- **AkashPriyadarshii/jev-superpowers** (30 stars; `obra/superpowers` rewritten with Jev
  gates) [C].
  - `docs/CONFIDENCE.md` sets one three-band table: **act / confirm with a human / stop**. A
    `pick` acts at ≥ 0.80, asks a human at 0.50–0.80, and stops below 0.50.
  - Its benchmark table is "design targets" and not measured.
- **devagrawal09/stanley-code** [C]. Jev routes a request to one *deterministic* workflow. When
  none fits, it falls back to an agent, then has an agent draft a new workflow that a human
  promotes.
- **devagrawal09/jev-review** (625 stars, up from 384) [C]. A staged review chain (a noul risk
  matrix, then choice and score profiles, evidence, mechanism, severity and routing), with
  thresholds in code. There were no commits since 2026-09-17.
- **cephalization/jev-triage** [C]. Jev answers fixed questions per issue: kind, severity,
  urgency, duplicate, **next maintainer step**. Human corrections are fed back into later runs.
  "Nothing is written back to GitHub."
- **npm, 2026-09-20 to 2026-09-27** [C, `npm search`]. Hook and gate packages keep appearing:
  `jev-enforce` ("make Claude Code actually follow your CLAUDE.md"), `jevy-vet` (OpenCode),
  `pi-jev-anti-slop`, `@tanstack/ai-typesafe`. None is an orchestrator.

## Comparison

| # | Project | Route shape | Jev's job | Fallback when unsure or on error | Persist / resume | Runs on |
|---|---|---|---|---|---|---|
| 1 | software-factory | YAML state machine with rework edges | A judge *stage*: pass/fail/human, plus pipeline triage | → `human` (park) | JSON per request, replay, session resume | `claude -p` with an OAuth token [C] (SDK credit [I]) |
| 2 | foreman | Policy loop over a directive vocabulary | Recurring checks, plus routing responsibilities | ESCALATE (terminal) | state.json + events.jsonl | Codex, OpenCode, Hermes; Codex hooks |
| 3 | jev-claude-orchestrator | Slice DAG in waves | Triage, QA, review, health, watch | → escalate, never approve | `.jev-orchestrator/` ledger | Claude Code plugin (subscription) |
| 4 | smithers | Durable flows | The 6th completion brake, session status, per-hunk lint | Deterministic brakes stand; "unknown" | SQL journal, replay | Own seats + AI Gateway |
| 5 | agentic-coder-skill | Fixed phases per tier | Validate a code-proposed tier | Proposal stands | Handoff dirs, JSONL | Claude Code skill + MCP |
| 6 | coding-orchestrator | Orchestrator plus 4 roles | Hook routing and deny-once gates | Fail open | jev-log.jsonl | Claude Code hooks |
| 7 | Canny | None (a guard) | Advice only | The deterministic rule stands | Ledger with recorded Jev answers | Claude Code and Codex hooks |
| 8 | atomic | Acyclic stage graph | Pick a model from a code shortlist | Code's ranking | Workflow runtime | Pi fork |

**No project uses XState** [C, grep across all clones]. Where a machine exists it is hand-rolled
(software-factory) or a durable-execution engine (smithers, atomic).

**Nobody drives Superset** [C, grep]. Nobody uses GitHub Issues as the run log either:
jev-triage reads the tracker but writes nothing back.

---

## Patterns that recur

1. **Facts first, Jev second, and Jev cannot override a fact.** [C in 3, 4, 7, 2]
   - jev-claude-orchestrator runs code vetoes before Jev.
   - Smithers consults Jev only after five deterministic brakes.
   - Canny: "only facts can block".
   - Foreman runtime guardrails override any proposed directive.

   In every measured anecdote the blocking decision came from code. Examples: orchestrator
   slice S2, and Canny's first live run.
2. **The verdict vocabulary is tiny and closed.**
   - software-factory: `pass | fail | human`, and a typo'd verdict parks.
   - jev-claude-orchestrator: exit codes 0, 1, 3 and 2.
   - JevRev: `fix | verify | continue | replan | human`.
   - Foreman: its directive enum.
   - agentic-coder-skill: `confirm | promote | demote`.

   The model's answer is always mapped into this set by code.
3. **"Code proposes, Jev validates or picks from a shortlist"** beats "Jev classifies blind".
   agentic-coder-skill moved to propose/validate in v3.21.0. Atomic replaced a Choice over
   every model with a code-ranked shortlist of about six. Both changes landed 2026-09-23 to
   2026-09-25 [C].
4. **An error or uncertainty never approves.** Pipelines that *advance work* fail closed:
   software-factory → `human`, jev-claude-orchestrator → escalate, Smithers → "unknown". Hooks
   that only *advise* fail open: coding-orchestrator, jev-belay. There are explicit *unsure
   bands*:
   - orchestrator hung between 0.2 and 0.7 → call back;
   - software-factory `confidence_below: 0.5` → human;
   - superpowers 0.50–0.80 → confirm with a human.
5. **Thresholds are asymmetric by error cost.**
   - Smithers: ≤ 0.3 on one question and ≥ 0.8 on the other.
   - coding-orchestrator: up at 0.35, down at 0.8.
   - software-factory: destructive at 0.6, scope at 0.8.
   - Thresholds are *named and central*: software-factory `$name`, Foreman TOML beside each
     check, superpowers `CONFIDENCE.md` as "the single source of truth".
6. **Human escalation should be a wait, not an end.** Foreman's reviewer blocked PR #25 because
   ESCALATE is terminal. software-factory's `human` parks a request that `sf run <id> --note`
   resumes. That is the only design here in which the human answer re-enters the route.
7. **Evidence is gathered by the supervisor at decision time, bounded, and recorded.**
   - The sources are `git diff`, untracked files, test summaries and a check ledger.
   - It is never the agent's own account.
   - The recorded evidence makes replay possible (Canny, Smithers, Foreman, bundlebox).
8. **Per-run isolation.** One request or slice or issue means one worktree, one branch and one
   state file (software-factory, orchestrator, agentic-coder-skill).
9. **Calibration is still missing.**
   - Foreman lowered its thresholds after a smoke test and says they are uncalibrated.
   - The orchestrator's pre-registered numbers are the best here: Jev is strong on QA (96%) and
     health (95%), weak on triage (46%) and review (9.5%).
   - jev-harness shows a reused test set inflating accuracy from 62% to 90%.

## What this means for Firehorse's choices

The choices come from `prototype/README.md` (#298, #299, #304, #305, #307) and
`superset-sessions.md`.

**Evidence in events: guards read only the event payload.** *Confirmed as the right call.*

- Smithers states the same property ("a resumed run judges exactly what the first attempt
  judged").
- Canny proves it with `replay`.
- Foreman persists every observation.

**One addition the prior art makes:** put the **Jev answer itself** into the event (the pick,
`p`, the model version and the latency). Record it whether or not it crossed the threshold, as
Smithers' `ClaimDemanded` and Canny's recorded answers do. A resume, or a threshold change,
should then replay without calling Jev again. The prototype's `decide` actor result should be
persisted in the snapshot, not recomputed [I].

**Threshold plus human fallback (p ≥ 0.8 and a legal pick, else a person).** *In the normal
range, and correctly fail-closed.* 0.8 matches Foreman `needs_human` and the orchestrator's
`qa.done`. Three refinements recur:

- **An explicit unsure band.** Treat low `p` on the top pick as "ask", separately from an error.
- **Asymmetric per-edge thresholds, where error costs differ.** A mistaken "advance to ship" is
  dearer than a mistaken "ask a person".
- **Central, named thresholds that events record.**

None is calibrated anywhere. Firehorse should log picks and human overrides so the threshold can
be fitted later. This is Foreman's hypothesis list, and jev-triage's corrections loop.

**Gate re-run by code, never read from prose.** *Universal.* Every project that advances work
re-runs or reads the check itself: the orchestrator's `SubagentStop` re-gate, software-factory's
shell stage, Canny's ledger and Smithers' brakes. No project lets Jev see a red gate and pass it.
Keep Jev off the gate entirely. A red gate is a guard (`gateRedHuman`), not a question.

**One run per map, with the tracker as the log.** *Partly novel.*

- **What everyone else keeps.** A local per-run file: software-factory's JSON, Foreman's
  `state.json` and `events.jsonl`, the orchestrator's `.jev-orchestrator/`. They also keep one
  worktree and branch per unit.
- **Where Firehorse differs.** Using GitHub Issues as the durable log has no precedent here.
  That supports D-182 (no position on disk) only as long as the tracker comments carry enough
  to rebuild the event payloads.
- **The closest analogue is agentic-coder-skill.** It runs one issue per session, puts handoffs
  under `.git/`, logs to JSONL beside that, and reports a mega-run failure mode (2/13 merged)
  that argues for keeping one run per map small [C].
- **What everyone agrees on.** The run needs *some* append-only record for replay. If
  Firehorse's is the persisted XState snapshot plus tracker comments, it should say which one
  is authoritative [I].

**Superset sessions as the step unit.** *No one else does this.*

- **The others' step units.**
  - software-factory uses `claude -p`: an OAuth token, SDK credit [I].
  - The orchestrator uses in-session subagents, on the subscription.
  - Foreman runs Codex App Server, or attaches to human-started sessions through hooks.
- **The attach model fits Firehorse.** Foreman's attach model (`foreman hook`: per-session
  state keyed by client and session id, outside the repo; one bounded Stop continuation) is
  the closest fit for "an interactive session the machine did not start in-process".
- **For Superset's missing status signal** (see `superset-sessions.md`), two fallbacks exist.
  Smithers' `jev.session` checker (working / idle / waiting-on-person from a 4 KiB output tail;
  errors read as unknown) and the orchestrator's transcript-mtime watchdog are both usable
  *second-tier* signals.

  The primary signal should stay a Firehorse `Stop` or `SessionEnd` hook that writes the
  outcome. Jev-on-output is at best a "probably waiting on a person" hint that routes to a
  human, never to an advance [I].

## Sources

**Repositories, all read at HEAD on 2026-09-27:**

- https://github.com/stratonext/software-factory: `README.md`, `docs/judging.md`,
  `docs/pipelines.md`, `docs/overview.md`, `docs/internals.md`,
  `.sf/pipelines/prompts/human-review.yaml`, `software_factory/config.py`, `judge.py`,
  `runners/claude.yaml`
- https://github.com/thruwire/foreman: `docs/routing.md`, `hooks.md`, `extensions.md`,
  `runtime.md`, `workers.md`, `what-foreman-proves.md`, `src/foreman/policy.py`,
  `responsibilities/`, commit `209182d`
  - PRs: https://github.com/thruwire/foreman/pull/16, /18, /23, /24, /25
- https://github.com/damian87x/jev-claude-orchestrator: `README.md`, `lib/stages.py`,
  `hooks/hooks.json`, `skills/conductor-max/references/jev-questions.json`
- https://github.com/smithersai/smithers: `CHANGELOG.md`, `apps/app/docs/HEALTH.md`,
  `flows/coding/jev-check.ts`, commits `68c6426`, `b09c0b6`, `293110c`
- https://github.com/clouatre-labs/agentic-coder-skill: `README.md`, `skills/coder/SKILL.md`,
  `docs/examples/2026-09-aptu-coder-5-issues.md`
  - Issue: https://github.com/clouatre-labs/agentic-coder-skill/issues/21
- https://github.com/davesheffer/coding-orchestrator: `README.md`, `bin/jev-route.py`
- https://github.com/qkal/Canny: `README.md`
- https://github.com/bastani-inc/atomic: `README.md`, commit `75dfcfb`
- https://github.com/dansya-arsana/jev-harness: `README.md`
- https://github.com/Alex314618-create/JevRev: `README.md`
- https://github.com/blackswanalpha/bundlebox/pull/64
- https://github.com/AkashPriyadarshii/jev-superpowers: `docs/CONFIDENCE.md`,
  `skills/jev-executing-plans/SKILL.md`
- https://github.com/devagrawal09/stanley-code, https://github.com/devagrawal09/jev-review,
  https://github.com/cephalization/jev-triage

**Indexes and discovery:**

- https://github.com/DansiDanutz/awesome-jev-typesafe
- https://x.com/omarsar0/status/2100693601021997193 (snippet only)
- https://x.com/zodchiii/status/2102377493705740417 (snippet only)
