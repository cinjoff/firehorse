# What Firehorse already has, and what it does not

Researched 2026-09-20 by a Firehorse research agent. I read this repo rather
than reasoning from its README: `AGENTS.md`, `CLAUDE.md`, `docs/ARCHITECTURE.md`,
`docs/WORKFLOW-MAP.md`, `docs/EVALUATION-FRAMEWORK.md`, `docs/DECISIONS.md`,
every file under `packages/firehorse-claude/`, the sources under
`packages/firehorse-core/src/` and `packages/firehorse-core/definitions/`,
`.github/workflows/ci.yml`, `.firehorse/manifest.json`, and `upstreams.lock.json`.
I ran `pnpm definitions:check` to confirm the projection gate is live. The
primitives being mapped are Osmani's six, from
[Loop Engineering](https://addyosmani.com/blog/loop-engineering/).

**Evidence state.** Everything about this repo below I verified against a file or
a command I ran, and I say which. Nothing here is measured: I did not run a loop,
did not run a paired trial, and have no number for what any of this would be
worth. The judgments about which gaps matter are mine. Read them as an argument,
not a finding.

## Verdict

Firehorse has sensors. That surprised me, because the brief I was given assumed
it did not, and I would rather correct it than confirm it. `pnpm
definitions:check` measures a gap between canonical definitions and their
generated mirrors, and `/firehorse:fix-bug` refuses to let an agent edit code
until a command goes red and refuses to call the work done until the same
command goes green. Those are a sensor and a stop condition in Mistele's sense.

What Firehorse has none of is the half of the loop that runs while nobody is
watching: no schedule, no actuator that opens a PR, no feedback file, no bound on
work in progress. Every loop in this repo is session-scoped and human-triggered,
and the person who triggers it is the sensor's only reader.

That is not an oversight, and this is the part I would not paper over. `AGENTS.md`
forbids it in as many words, and D-25 forbids the format that would express it.
So the honest finding is not "Firehorse is missing a loop." It is that Firehorse
has built the two expensive prerequisites for one, deterministic sensors and
written-down stop conditions, and has a standing decision against building the
cheap part. Whether that decision still holds is a question for the tracker, not
for this document.

The gap that does hurt, and that no decision protects, is the one
[`gepa.md`](../skill-quality/gepa.md) already named: there is no scored-task
harness. A loop and an eval harness need the same missing object, which is a
repeatable measurement of whether a change to a skill helped. That conclusion
carries over here unchanged.

## Osmani's six primitives against this repo

**Scheduled automations: absent.** `.github/workflows/ci.yml` is the only
workflow in the repo. It triggers on `push` to `main` and
`Konstantin-Indjov/**`, on tags matching `v*`, on `pull_request`, and on
`workflow_dispatch`. There is no `schedule:` key anywhere in `.github/`, and I
grepped for `cron` across `.github/` and every `package.json` and found nothing.
The plugin does ship hooks, in `packages/firehorse-claude/hooks/hooks.json`, but
both are `SessionStart` with matcher `startup|resume`, running `check-setup.mjs`
and `check-update.mjs` with a five-second timeout. Those fire when a human opens
a session. They are event triggers on human presence, which is the opposite of
the primitive.

**Git worktrees: handled, not used.** Firehorse treats a worktree as an
environment fact that must not break things, rather than as isolation it creates.
`firehorse-recall/SKILL.md` records that the supermemory container tag "hashes
the git remote, not the path," so "every worktree of a repo shares one tag," and
warns that "a worktree that recalls nothing is a server or tag problem, not a
path problem." `firehorse-setup/SKILL.md` checks whether the current path
contains `/.superset/worktrees/` for identity resolution, and D-141 at
`docs/DECISIONS.md:746` explicitly forbids inferring canonical project identity
from worktree parent directories. No workflow creates a worktree, and none runs
agents in parallel across them.

**Skills: present, and the strongest-specified surface here.** Nine canonical
definitions live in `packages/firehorse-core/definitions/`, eight workflows plus
one skill, and `pnpm definitions:check` confirmed nine definitions against nine
generated mirrors. Six project to `packages/firehorse-claude/commands/firehorse/`,
two maintainer-audience ones (`ship`, `upstreams-check`) project to
`.claude/commands/`, and `firehorse-recall` projects to the plugin's `skills/`
tree. Upstream skills are pinned by sha256 in `upstreams.lock.json`, with
`mattpocock-skills` at 1.2.3 and `impeccable` at 4.3.1. Mistele's advice to
invest heavily in the actuator skill and iterate it over time describes what this
repo already does, one layer up.

**Plugins and connectors: present, and the deepest.** The repo is a Claude plugin
and depends on upstream plugins while vendoring nothing (D-156). Workflows declare
MCP requirements in their frontmatter and mean them: `build.md` and `fix-bug.md`
both require `mcp:codebase-memory-mcp` and both instruct the agent to announce the
degradation in the first line of the report when it is absent. `/firehorse:memory`
opens a self-hosted supermemory store as a graph. Of Osmani's six, this is the one
Firehorse would not need to build.

**Sub-agents: conditional, and never the checker by default.** There is no
`agents/` directory in `packages/firehorse-claude/`. Delegation appears as
in-prose conditionals. `build.md:77` says "Where the repo supports subagents, run
the `mattpocock-skills:code-review` pass as a subagent so its context stays
clean," and `fix-bug.md:73` states the default the other way: "Nothing is
delegated by default, the loop stays in the session reading its output." The
maker-and-checker split that Osmani calls "the most useful structural thing in a
loop, by far" exists in Firehorse as an optional context-hygiene measure, not as
an independence guarantee. For a human-attended session that is a defensible
choice, because the human is the independent checker. For an unattended loop it
would not be.

**On-disk state: present, and unusually good.** `.firehorse/manifest.json` is
`schemaVersion: 2` and records setup versions, which anchors exist, and index
freshness as a commit SHA with a timestamp, which is state by ancestry rather
than by date. `upstreams.lock.json` pins every upstream skill by hash.
`docs/DECISIONS.md` is 3,287 lines of append-only binding decisions, which is
exactly Osmani's "the agent forgets, the repo doesn't" with more discipline than
his markdown-file version. And planning deliberately does not live in the repo:
D-168 puts it in the tracker, D-174 makes the shipped workflows read the tracker
rather than assume it, and `docs/agents/issue-tracker.md` names GitHub Issues.
That is Osmani's Linear-board option, chosen on purpose.

Four of six, then, with worktrees handled rather than used and sub-agents
present but optional. The missing one is the heartbeat, and Osmani's own line
about it is the relevant one: "Automations are what make a loop an actual loop
and not just one run you did once."

## The sensors that exist

Two deterministic ones, at repo scope.

`pnpm definitions:check` runs `scripts/definitions.ts --check` and compares every
canonical definition against its generated mirror, the manifests, and the upstream
skill references. It is a drift sensor in the exact sense Mistele means: a
deterministic measurement of the gap between a set point (the mirrors match the
definitions) and the current state. It runs unattended on every push and pull
request, because `pnpm typecheck` calls it first and CI runs `pnpm typecheck`.

`pnpm upstreams:check` runs `scripts/upstreams.ts` and reports which upstream
skills moved against the lockfile, and which workflow definitions and body steps
depend on the part that moved. It is the better-designed of the two, because it
reports impact rather than a boolean. It is also the one with a problem. It is
not in `ci.yml`, so it only runs when a maintainer runs `/firehorse:upstreams-check`
by hand. And the workflow definition records that even if you did wire it in, it
would degrade: `upstreams-check.md:82` says that "On CI `~/.claude/plugins/` is
absent. The script prints one line, skips the on-disk comparison, and exits 0, so
the reference check silently degrades to lockfile-only." A sensor that exits 0
when it could not measure is the failure Mistele warns about when he chooses
AST-grep specifically because it sits out of band from the tooling an agent can
disable. This one is not disabled by an agent; it is disabled by the runner not
having the plugins. The effect on the reading is the same.

The third sensor is per-task and lives inside `/firehorse:fix-bug`. Its
definition is the closest thing in this repo to a working control loop, and it is
worth quoting because it states a set point and a stop condition in the same
document:

- "The loop: the exact command or script that goes red on this bug."
- "**A red loop precedes every edit.** No loop, no patch: produce a diagnosis
  instead, and say why the loop could not be built."
- "A loop that passes on the broken code is not a loop for this bug. Confirm it
  goes red before trusting anything it says afterwards."
- "→ Done when: the loop goes green and the regression test has a path."

That is a sensor, a set point, a validity check on the sensor, and a stop
condition. `/firehorse:build` carries the weaker form, "Evidence closes work,
claims do not," with the gate being the repo's own typecheck and test scripts.

So the honest inventory is that Firehorse has sensors at two scopes and a stop
condition at one, and reads all of them with a human in the session.

## What is missing

**A controller and an actuator, and the schedule that would run them.** Nothing
in this repo selects the next unit of work from a measurement, and nothing applies
a change and opens a PR without a person present. Everything is a person typing
a slash command.

**A bound on work in progress.** Not needed yet, because nothing produces
unattended work. Worth noting that if a loop is ever built here, Mistele's
one-open-PR check is five lines of workflow and would be the cheapest thing in it.

**A disturbance dampener.** Firehorse has the ingredient and has not used it this
way. A committed baseline of sensor output plus a PR check that fails on new
deviations is exactly the shape of `definitions:check` already, and could be the
shape of `upstreams:check`. The dampener is the piece you can build with no agent
at all, and it is the piece I would build first if anything here moves.

**A scored-task harness, which is the one that actually blocks things.**
`docs/EVALUATION-FRAMEWORK.md` says so itself, in a section headed "What is not
built yet": no fixtures exist in this repo, the runner exists but is not wired in
([#227](https://github.com/cinjoff/firehorse/issues/227)), no session reader
exists ([#231](https://github.com/cinjoff/firehorse/issues/231), blocked), and
`/retro` is not in the pinned upstream mirror. This is the same conclusion
`gepa.md` reached by a different route, and the reason it recurs is structural:
GEPA needs an evaluator, a control loop needs a sensor, and the retro loop needs a
grader. All three are one missing object. The framework even sizes the object
correctly, at "at least 10 times per fixture," with distributions rather than
means, after Dan Luu's result that the sign flipped between tasks.

Two things in that document are worth carrying into any loop work here. The ACES
result that roughly one skill install in four makes things worse is the argument
for measuring a loop's output rather than trusting it. And the finding that
scan-only gates correlate with LLM-judge quality at Spearman rho = 0.14 is the
argument against building a loop whose sensor is a model reading a document,
which is the same conclusion Mahoney reached experimentally in
[criticism.md](criticism.md).

## The constraint that makes this a decision rather than a gap

`AGENTS.md`, under "Hard rules":

> Do not add a runtime, prompt loader, provider transport, autonomous execution
> loop, or hook until that work is explicitly scoped.

D-25 (2026-05-15) closes the other door, for the definition format:

> It may include purpose, triggers, inputs, supporting skills, agent roles, tool
> expectations, document expectations, outputs, and safety gates, but it will not
> define a runnable DAG, branching engine, or execution loop.

D-121 at `docs/DECISIONS.md:2770` repeats the same prohibition for the session
audit helper. And D-166 (2026-09-11) dropped a skill called `feedback-loop`
outright, on the grounds that it was "replaceable, unproven, or unexamined," with
the note that it "returns only if their absence is felt."

Three of those four are about `firehorse-core`, and a GitHub Actions workflow is
not core code, so a loop in `.github/workflows/` would not violate D-25 on its
face. The `AGENTS.md` rule is broader and says "until that work is explicitly
scoped," which reads as a gate rather than a ban. I am flagging the tension rather
than resolving it, because resolving it is a decision and this is a research note.

One factual correction while I am in this file. `docs/WORKFLOW-MAP.md` inventories
skills from the `firehorse-pi` era, including `ast-grep`, `pi-subagents` with its
"parallel fan-out, async/background runs," and eight named agent roles. None of
those exist in `packages/firehorse-claude/` today. If anyone reads that map as a
description of current capability when scoping loop work, they will believe this
repo has a parallel-subagent surface and a structural search tool that it does
not. `upstreams.lock.json` pins three plugins, `impeccable` 4.3.1 with one skill,
`mattpocock-skills` 1.2.3 with twenty-five, and `supermemory` 0.1.6 with none.
No `ast-grep` among them, which is worth a note of its own, because AST-grep is
the exact tool Mistele builds his sensor from and this repo used to have it.
