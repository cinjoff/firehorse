# pstack

Research notes on **pstack**, lauren (`@poteto`)'s personal skill set for agentic
engineering, and what parts of it are worth taking into Firehorse.

## Source note

Firecrawl scraped the two published parts of the series:

- [The Complete Guide to pstack Pt. 1](https://x.com/poteto/status/2094457600259842065) (2026-08-31) — verification.
- [The Complete Guide to pstack Pt. 2](https://x.com/poteto/status/2097732320606507506) (2026-09-09) — research, planning, prototyping, architecture.

Part 3 had not been posted as of 2026-09-14. The code itself is public:
[`cursor/plugins/pstack`](https://github.com/cursor/plugins/tree/main/pstack),
mirrored at [`backnotprop/pstack`](https://github.com/backnotprop/pstack) (MIT).
The notes below are grounded in that checkout, not only in the posts.

The author is on the React compiler team and works at Cursor; pstack is what she
uses to maintain Cursor and the Grok Bot codebase. She claims ~2,000 PRs/month
and "100-1000x" team output. Treat the numbers as marketing and the mechanisms
as the substance.

## What pstack actually is

One sticky entry-point skill plus three kinds of supporting file:

| Layer | Count | Shape |
|---|---|---|
| Mode | 1 | `/poteto-mode`, `mode: true`, stays on across turns, routes everything else. |
| Playbooks | 23 | Reference files *inside* the mode skill, loaded only when the task matches. Not slash commands. |
| Skills | ~24 | Situational. The mode invokes most of them for you (`how`, `why`, `architect`, `arena`, `swarm`, `interrogate`, `unslop`, `tdd`). |
| Principles | 21 | One rule per skill file. The mode carries an inline index and reads it at task start. |

It also ships two subagent types (`poteto-agent`, `Comment Sicko`), a
model-per-role config written by `/setup-pstack`, and a dormant automation pack
(`benny`) that triages Slack reports and reproduces bugs.

Three structural choices are the interesting part:

1. **Conditional loading.** Playbooks are files the router opens on match, so
   twenty-three workflows cost one skill's worth of context.
2. **Verbatim step copying.** The mode must copy the matched playbook's steps
   into the todo list *before* reasoning about the task. A step you skip stays in
   the list with `skip: <reason>`.
3. **Citation discipline.** The reply must name each principle that shaped a
   decision and the specific choice it changed. "A citation with no decision
   behind it means you skipped its leaf skill."

## Part 1 — verification is all you need

The thesis: an agent that can verify its own work closes the loop without you.
Everything else is downstream.

- **Verification is infrastructure, not a skill.** She suggests an oncall
  rotation on it. `/maintain-verification-skill` runs daily.
- **Build the Lever.** Prefer tools over markdown. A verification skill ships a
  small CLI (`control-app navigate|debug|screenshot|seed-db|login`) so agents run
  a command instead of writing a throwaway script. Agent-friendly CLI properties:
  deep modules, `--dry-run` on anything destructive, subcommands for progressive
  disclosure, error messages that say what to do instead, rich `--help`, JSON out.
- **Feature Map.** A `references/features/` directory: a README index plus one
  file per user-facing feature, each answering what it is, how to reach it from a
  user's point of view, how to drive it with the harness, and what end state
  proves it works. She calls it "materialized memory" and argues the codebase is
  the real memory store, the map just a compact projection of it.
- **Tech stack as a verification decision.** If your stack is hard to drive and
  debug, that is a reason to build tooling or change stacks, not a constraint to
  accept.
- **Cloud agents over worktrees.** Worktrees cap out around ten parallel agents
  and burn disk; Cursor's cloud agents get a real machine, snapshotted after the
  first build. `/swarm` fans verification out across them.
- **The generated artifact is proved before handover.** `/create-verification-skill`
  runs its own output end to end once (launch, doctor, drive one mapped feature,
  capture evidence, clean up) and checks the evidence survived cleanup. "A
  generated skill that was never executed is a draft, not a deliverable."

## Part 2 — research, design, planning

- **The indirect prompt.** Ask the agent to restate the problem in its own words
  before it does anything. It compresses the noise, exposes misreadings early,
  and avoids seeding your own wrong hypothesis.
- **`/teach` = `/how` + `/why`.** `/how` traces runtime mechanics, fanning out
  parallel explorers on a fast model when the subsystem spans services. `/why`
  investigates intent across git history, PR comments, the tracker, long-form
  docs, chat, observability, error tracking, and the analytics warehouse — one
  investigator per source, null results count as findings. Restating for the
  human turns out to help the agent too.
- **`/recall`.** Past transcripts are context goldmines. Recall mines your own
  chat history *and* the shared record, verifies what it finds against live `git`
  and `gh` state, and returns a fixed contract: capsule, threads with status
  tags, recurring problems, single next move.
- **Readme-driven development.** For anything others consume, write the tutorial
  first and work backwards to the architecture. This forced her to build
  `/technical-writing` (Diátaxis modes kept separate, Google style, plain English)
  because the first draft mixed tutorial, how-to, reference, and explanation.
- **Planning with code.** "I don't believe in planning" is a stance about
  abstract plans, not about thinking. Open forks get settled by throwaway
  prototypes behind a switcher, driven and measured with the verification skill.
  She refuses to review abstract plans adversarially: agents invent theoretical
  risks and edge cases that never happen.
- **`/architect`.** Ground with `how`/`why`, then an arena of parallel candidate
  runners across model families, each producing a caller usage sketch, core
  types, signatures, and rationale; a cross-judge on a different model scores
  them against a rubric; implement against the sketch; scrap it when
  implementation proves it wrong. Repeated workarounds at unrelated call sites or
  `any` escape hatches are the empirical proof that the design is wrong.
- **Plans, when you want one.** The multi-phase playbook produces a tactical
  execution plan after the design settles, every item structured around proof
  (tests alone are not verification), validated by a script, deleted when done.

## What is Cursor-shaped and does not port

Cloud agents, custom modes (Opt+Enter pins a mode), Cursor's `/loop`, `.cursor/skills`
paths, the model roster in `/setup-pstack` defaults, and the skills that live in
`cursor-team-kit` rather than pstack (`control-cli`, `control-ui`, `deslop`).
pstack is a Cursor plugin, so it can never be a Firehorse `upstreamSkills` entry.
Under [D-172](./DECISIONS.md) that is fine: it is a design source, not a basis.

## Where it touches Firehorse

| pstack idea | Firehorse today | Delta |
|---|---|---|
| `/create-verification-skill`, `/maintain-verification-skill` | `feedback-loop` dropped (D-166) | The whole load-bearing layer is absent. |
| Feature Map as maintained verification source | `/firehorse:index` writes code anchors under `docs/codebase/` | Same mechanism, one layer up: user-visible behavior instead of code structure. |
| Mode + conditionally loaded playbooks | 8 flat workflows, each fully loaded | The definition format cannot express a router and its playbooks. |
| 21 principles as leaf skills, cited per decision | none | No auditable-rigor mechanism in `build` or `fix-bug`. |
| Model-per-role config | none | Claude Code supports subagent model overrides; the manifest could carry roles. |
| `/recall` over transcripts plus shared record | `firehorse-recall`, claude-mem only | Transcript mining and the output contract are missing. |
| `/reflect` turning a session into skill edits | `docs/audits/session-audit` | Nothing closes the loop back into a definition edit. |
| Prototype-first instead of asking the human | `/firehorse:build` prototypes when UI shape is uncertain | pstack's version is a classification rule: if running something answers it, it is not the human's question. |
