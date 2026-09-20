# Evaluation framework

How Firehorse decides whether to take in a new tool, skill, workflow, or MCP
server, and how it finds out afterwards whether that was right.

Two loops, one document, because they feed each other. Intake evaluates
candidates that arrive from outside. The retro loop reads our own session
history and produces most of the candidates worth evaluating.

## Why this exists

The people writing the frameworks everyone copies say plainly that they have
not measured them. Asked to back a workflow claim in September 2026, Matt
Pocock answered: "Yep it's just my working assumption, no evals or evidence."
That is not a criticism of him, it is the state of the practice, and it is the
reason a repo that curates other people's skills needs its own gate.

Two results set the bar:

- **Roughly one skill install in four makes things worse.** ACES
  ([arXiv:2608.20614](https://arxiv.org/abs/2608.20614)) ran paired live trials
  with and without a target skill across 947 scored cases, 58 production skills,
  and four harnesses. Mean composite Skill Lift was 0.2134, and lift was
  positive in 72.8% of cases. "Install it and see" has a real negative expected
  value on the remaining quarter.
- **Structural review does not predict usefulness.** In the same study,
  scan-only gates correlated with LLM-judge quality at Spearman rho = 0.14. A
  skill that reads well and passes a lint is telling you almost nothing about
  whether it helps.

So: judge candidates on a measured delta against a baseline, not on how good
the README is.

## Stage 1: the intake gate

Filed through the `Evaluation candidate` issue form, which lands the issue with
`candidate` and `eval:proposed`. Five fields are required because five
questions decide whether a trial is worth anyone's time.

**Source.** The thing itself. A post about a tool is not the tool.

**Kind.** Skill, workflow, tool or CLI, MCP server, harness, hosted service, or
convention. Kind sets the trial shape, because an MCP server is measured on the
tokens it costs at idle and a workflow is measured on the runs it changes.

**External dependency.** Anything other than "none" adds the `optional-dep`
label and the constraint in the section below.

**Claim under test.** One sentence: adding X makes Y better by Z, naming the
Firehorse workflow it touches. A candidate without a named workflow is a
bookmark, and belongs in `docs/research/` rather than the tracker.

**Cheapest test that could refute it.** Name the baseline arm. If you cannot
describe a result you would accept as a no, you are not evaluating, you are
shopping.

Triage answers the remaining fields and moves the issue to `eval:shortlisted`
or closes it. Closing is the common outcome and is not a failure: most
candidates are answered by "this overlaps `/firehorse:build` and costs more".

## Stage 2: the paired trial

One arm with the candidate, one arm without, everything else held fixed: same
model, same effort, same fixture, same verification gate, same grader. The
number you report is the difference. Borrow the name from ACES and call it
**lift**.

Holding things fixed is the whole method. A trial that compares this week's
workflow on this week's model against last month's memory of the old one
measures nothing.

### Run counts and what you report

Dan Luu's [agentic coding notes](https://danluu.com/ai-coding/) are the
cautionary case. He benchmarked a prompting mode 50 times per task across three
tasks. Cost and wall clock won decisively, at p = 0.005 and p < 0.001. Outcome
quality flipped sign between tasks: P(better) was 0.958 on one optimization
task and 0.04 on another. Two runs would have produced a confident, wrong
answer either way.

- Run each arm at least 10 times per fixture, more when the arms are close.
- Report the distribution, not the mean. A mean hides the sign flips that
  decide whether a candidate is safe to adopt repo-wide.
- Report per-fixture results separately. Averaging across fixtures reproduces
  exactly the summary-number problem that makes public benchmarks useless.

### Metrics

Three groups. Record all three for every trial, because the realistic success
case in this field is a cost win at flat quality, and you cannot see that if you
only score outcomes.

**Outcome.** Did the task get done? Task pass rate against the fixture's own
verification gate, and goal accuracy where pass or fail is too coarse.

**Process.** What did the agent do on the way? Wrong-file edits, tool calls,
retries, gate failures before the last one, and whether it followed the
workflow it was given. ACES found the largest gains here rather than in outcome,
in skill execution, behaviour checks, and efficiency, which are exactly the
signals a document scan cannot observe.

**Cost.** Tokens in and out, idle token footprint, wall clock, money, and
reviewer load. Idle footprint is its own line because progressive disclosure is
the one constraint this field has fully internalised: Matt Pocock's whole skills
repo advertises 660 tokens loaded until something fires. Reviewer load is the
line everyone drops, and r/ClaudeCode is full of what dropping it costs.

Anthropic's own write-up on
[agentic coding straining CI](https://claude.com/blog/agentic-coding-is-straining-ci-heres-how-we-scaled-test-impact-analysis-at-anthropic)
is the reminder that a throughput win relocates cost into the verification
system. Count it.

### Reading the result

- **Adopt** when lift is positive on outcome or process, cost is acceptable, and
  the sign holds across fixtures. Label `eval:adopted`, put the numbers in the
  issue, and say which workflow changed.
- **Adopt on a cost win at flat quality.** This is a real result, not a
  consolation. Say so explicitly so nobody re-litigates it later.
- **Reject** when lift is flat or negative, or when it is positive on one
  fixture and negative on another with no rule for telling them apart. Label
  `eval:rejected` and keep the numbers. A rejected candidate with a recorded
  number is worth more than an untested one, because it stops the next person
  re-proposing it.
- **Park** when the trial is blocked on something we have not built. Keep it
  open with `parked`.

## The fixture contract

A trial needs a repo to run against, with a known right answer. Fixtures live
in the repo, are committed, and are small.

Prior art: `cinjoff/fhhs-skills` carries `evals/evals.json` plus
`evals/fixtures/<scenario>/`, where each scenario is a checked-in project state.
Scenarios there range from `minimal-gsd` through `broken-project` and
`auto-corrupt-state` to `nextjs-app-deep`, which has real source, tests, and
end-to-end specs. Each eval entry pairs a prompt with an `expected_output`,
typed assertions of kind `behavioral`, `output`, or `guard`, a tier, and
`required_terms` / `forbidden_terms` checks.

That shape is worth taking, with one change. Those evals are **single-arm**:
they assert that the agent did X, with no baseline run and no cost recorded. A
single-arm assertion catches a regression in a skill you already trust. It
cannot answer whether adding the skill helped, which is the question intake
asks. So:

- Keep the fixture-as-committed-repo-state idea, the typed assertions, and the
  guard assertions for things the agent must not do.
- Add the baseline arm and the cost record to every entry.
- Plant the defects deliberately, the way `broken-project` does, so the right
  answer is known rather than judged.

A fixture states its own verification gate, derived from the repo the way
`D-175` requires, so the grader is the fixture's tests rather than an opinion.

## Optional dependencies

Some candidates only work with a third-party service. Jev is the current case:
it is interesting for exactly the branch-point decisions Firehorse makes, and it
has no zero data retention policy today.

The standing rule for any candidate labelled `optional-dep` (D-179):

- Firehorse works fully without it. A user who has never heard of the
  dependency sees no degraded workflow and no nagging.
- Adoption is configurable per project and globally, chosen at Firehorse setup
  or at project setup, never defaulted on.
- The trial reports both arms, and the arm without the dependency is the one
  that has to stand on its own.
- A candidate that cannot beat a deterministic baseline does not ship behind a
  flag either. That is
  [#203](https://github.com/cinjoff/firehorse/issues/203) and it applies to
  every optional dependency, not just Jev.

Firehorse's standing position on decision models is still open at
[#197](https://github.com/cinjoff/firehorse/issues/197). This section describes
the packaging constraint, not that decision, and defers to it.

## The retro loop

Intake handles what arrives from outside. Most of what is actually wrong with a
workflow shows up in our own sessions, and Matt Pocock's answer to that is a
`/retro` skill: after a session, look at what went wrong and adjust the skill
rather than the prompt.

Our version reads session history rather than relying on recall, because the
interesting failures are the ones nobody remembered to report.

**What a retro looks for**, in rough order of how often it pays:

- Instructions the agent was given and did not follow, and where in the run it
  stopped following them.
- Work the agent redid, and the correction that preceded it. A correction you
  have typed three times is a skill you have not written.
- Tool calls that returned nothing useful, and the tokens they cost.
- Gate failures, and whether the gate caught a real defect or a self-inflicted one.
- Context spent before the first useful edit.

**What a retro produces:**

- A change to a Firehorse definition, which goes through the normal build path.
- A `retro`-labelled issue when the finding needs work rather than an edit.
- A `candidate` issue when the finding points outside the repo, which is how
  the two loops connect.
- A fixture, when the failure is reproducible. This is the highest-value output
  of the whole loop: a retro finding that becomes a planted defect is a
  regression you cannot reintroduce quietly.

Concept [#58](https://github.com/cinjoff/firehorse/issues/58), auditing sessions
for tooling efficiency, outcome, and safety, is the implementation ticket for
the reading half. Note that session transcripts are local and stay local; the
privacy boundary is [#127](https://github.com/cinjoff/firehorse/issues/127).

## Label lifecycle

| Label | Meaning |
| --- | --- |
| `candidate` | A tool, repo, or workflow proposed for evaluation |
| `eval:proposed` | Filed, intake gate not yet answered |
| `eval:shortlisted` | Passed the gate, a trial is worth running |
| `eval:trialling` | Trial running or awaiting its numbers |
| `eval:adopted` | Measured and taken in, numbers in the issue |
| `eval:rejected` | Measured and declined, numbers in the issue |
| `optional-dep` | Needs a third-party dependency, must be configurable |
| `retro` | A finding produced by a session retro |

One `eval:` label at a time. `parked` defers a candidate without closing it,
the same way it works for concepts.

## What is not built yet

Stated plainly so nobody reads this document as a description of working
machinery:

- **A runner exists and we have not wired it in.** `claude plugin eval` ships a
  no-plugin baseline arm as its default, `--ablation with-without`, with
  `regex`, `tool_order`, `tool_used`, `file_exists`, `llm`, and `baseline`
  graders. Verified against CLI 2.1.278 on 2026-09-20. So the paired trial does
  not need building, it needs connecting: [#227](https://github.com/cinjoff/firehorse/issues/227)
  wires it into this repo and [#206](https://github.com/cinjoff/firehorse/issues/206)
  is smaller than it was written to be. Do not build a runner.
- No fixtures exist in this repo. The `fhhs-skills` set is prior art to adapt,
  not something we currently have.
- No session reader exists. Concept #58 is the ticket, and
  [#231](https://github.com/cinjoff/firehorse/issues/231) is the build, blocked
  until we know what transcripts contain.
- `/retro` is not in our pinned upstream mirror. `mattpocock-skills` 1.2.3 has
  no retro skill; it was announced upstream on 2026-09-18 and our mirror
  predates it.

Until the suite is wired in, a trial is run by hand and its numbers are pasted
into the issue. That is worth doing rather than waiting, because a hand-run
paired trial with ten runs per arm already beats every adoption decision made
on a README.
