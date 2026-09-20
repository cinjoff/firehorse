# Measuring whether a skill helps

Researched 2026-09-20. This deepens the measurement half of
[the evaluation framework](../../EVALUATION-FRAMEWORK.md), which already settles
the paired-trial shape, the three metric groups, and the fixture contract. What
follows is the method detail you need to build a harness: how to measure
discovery separately from outcome, how to check that a loaded skill was
followed, how many runs to pay for, and which harness to stand up.

State of the evidence: one substantial empirical study
([ACES](https://arxiv.org/abs/2608.20614), NVIDIA, 947 scored paired cases), one
open-source implementation of it
([NVIDIA/SkillEvaluator](https://github.com/NVIDIA/SkillEvaluator), Apache 2.0,
support level "Experimental"), and one built-in runner that already does the
paired arm (`claude plugin eval`, verified against CLI 2.1.278 on this machine
on 2026-09-20). Discovery measurement is thinner: ACES gives a taxonomy and a
stress result, nobody publishes a discovery benchmark, and the design in
section 1 is mine, assembled from those parts.

## The headline answer

Stand up `claude plugin eval` this week. It already runs a no-plugin baseline
arm, it already has a `tool_used` grader that observes whether the Skill tool
fired, and its own authoring rules require a should-NOT-fire case in every
suite. You get the paired trial and the discovery instrument from one tool you
have installed, with no Python, no Docker, and no second credential. Write the
discovery suite before the outcome suite, because a skill that never fires has
an outcome lift of exactly zero however good its body is.

## 1. Measuring discovery

Discovery is a classification problem, so measure it with classification
metrics. For each skill you own, you need a labelled prompt set, an activation
signal, and a confusion matrix.

### The prompt set

ACES bootstraps four buckets from `SKILL.md`, following a taxonomy it credits to
the OpenAI Codex team and Anthropic's skill cookbook:

- **Explicit.** The user names the skill. "Use `firehorse:build` to work
  issue 204." Tests that direct invocation survives a rename or a description
  edit.
- **Implicit.** The user describes the scenario and names nothing. "Work
  issue 204." Tests whether the name and description carry their own weight.
- **Contextual.** Realistic, noisy phrasing that still needs the same action.
  "I'm picking up 204 this afternoon, it touches the projector." Tests
  triggering under the wording real people use.
- **Negative control.** An adjacent request the skill must not handle.

Four cases is a bootstrap, not a measurement. Write twelve per skill, and split
the negative controls three ways, because the three failure modes have different
fixes:

| Bucket | Count | What a failure tells you |
| --- | --- | --- |
| Explicit | 2 | The name or the manifest is broken |
| Implicit | 4 | The description does not match how people ask |
| Contextual | 3 | The description is too narrow for noisy prompts |
| Negative, near neighbour | 2 | Two of your skills have overlapping descriptions |
| Negative, out of scope | 1 | The description over-claims |

A near-neighbour negative names a scenario a *different* Firehorse skill owns:
if `/firehorse:build` fires on "this test is failing" instead of
`/firehorse:fix-bug`, that is a routing defect and the fix is in both
descriptions. This is the case class that matters most in a repo with a dozen
skills, and it is the one a per-skill eval suite misses by construction.

### The activation signal

Read it from the trace, not from the answer. In `claude plugin eval` the
instrument is a `tool_used` grader:

```yaml
# evals/build-implicit-01/graders/fired.md
---
type: tool_used
tool: Skill
input_match: "firehorse:build"
min: 1
arm: both
---
```

A caveat for this repo: most Firehorse units ship as `/firehorse:*` commands,
and a command the user types is not a Skill tool call, so `tool_used` observes
nothing. Discovery in the sense that matters here applies to the two real skills
and to any command body an agent reaches for on its own. For the rest, the
measurable question is adherence, not activation.

For a negative control, set `min: 0`, `max: 0`, and `arm: both`. All three are
needed: omitting `min` leaves it at 1, and omitting `arm` on a `tool: Skill`
grader makes it display-only under ablation. That last rule is correct, because
a Skill-fired grader would otherwise score 1 in the with-plugin arm and 0 in the
baseline arm for free and inflate every delta. So on a should-fire case leave
`arm` unset and let outcome graders carry the score; on a should-NOT-fire case
set `arm: both`, because there the non-firing is the outcome.

### The numbers to report

Per skill, over the should-fire set and the negative set:

- **Activation recall** = fired runs / should-fire runs. Your headline.
- **Activation precision** = correct fires / all fires, counting a fire on a
  negative control and a fire of the wrong skill as false positives.
- **Wrong-skill rate**, reported apart from **no-skill rate**. Silence means the
  description is invisible; the wrong skill means two descriptions collide.

Then report the whole-repo confusion matrix: rows are prompts labelled by the
skill that should own them, columns are the skill that actually fired, plus a
"none" column. The diagonal is recall, the off-diagonal cells name the pairs to
rewrite, and the "none" column is the backlog.

### Sweep the shelf size

Activation is a property of a skill in a workspace with a given number of
competitors, and that dependence is large. ACES ran a 25-variant stress study
over five target skills at 1, 5, 10, 20, and 50 visible skills across two
harnesses. Mean overall lift held at 0.133 to 0.149 from 1 through 20 visible
skills. At 50 the with-skill pass rate fell to 0.55 against 0.725 at one visible
skill, and mean wall clock rose from 258 seconds at one to 451 at 20 to 1,290 at
50. The same pressure shows up in tool retrieval:
[RAG-MCP](https://arxiv.org/abs/2505.03275) reports tool-selection accuracy of
43.13% with retrieval against 13.62% for a flat baseline over a large MCP pool,
across 20 independent trials per condition.

So run the trigger set twice and report both. ACES names the gap: **isolation
mode** puts only the target skill in the workspace, **group mode** adds fixed
decoys, and the difference is the **routing premium**. A near-zero or negative
routing premium says the name and description fail to distinguish the skill from
its neighbours even when the body is fine.

### What this costs

A discovery case does not have to finish the task. Cap `max_turns: 2` and set
`allowed_tools: [Skill, Read]`, and the run ends a turn or two after the routing
decision you are measuring. Twelve prompts times three runs times two shelf
sizes is 72 short runs per skill, which is why discovery is the right thing to
build first.

## 2. Measuring whether a loaded skill was followed

Grade the trajectory, not only the last message, because that is where the
effect lives. Across the 947 ACES paired cases the process metrics moved most:
skill execution by 0.3263, behaviour checking by 0.2983, skill efficiency by
0.2758, against 0.1431 for final-answer accuracy. A harness that grades only the
final answer is looking away from the largest signal it has.

Three mechanisms, cheapest first.

**Deterministic trace checks.** ACES's `skill_execution` metric is four pass/fail
sub-checks scored as their mean: *activation* (the agent read the expected
`SKILL.md`), *script_execution* (it invoked the expected script), *workflow_order*
(it read before it executed), and *error_recovery* (on a failed tool call it
attempted a recovery before abandoning the workflow). Its `skill_efficiency`
metric adds *routing* (the agent read only allowed skills) and *tool_efficiency*
(productive calls over total, with named waste indicators such as `--help`
fishing and exploratory `ls` at wrong paths). These map onto `tool_used`,
`tool_order`, and `regex` with `target: trace`. None of them calls a model.

**Typed assertions on artifacts.** `file_exists` with a glob, and `regex` with
`target: {source: file, path}` for a created file's contents. One sharp edge: the
runner's `files` target lists paths created during the run, so a file that
existed beforehand grades as absent even when the agent modified it.

**Behaviour checks.** ACES's `expected_behavior` is an ordered list of free-form
sentences ("read `git-skill/SKILL.md` before executing", "confirmed the
destructive operation with the user before proceeding"), each judged yes/no by an
LLM against the trajectory and scored as the fraction satisfied. The equivalent
here is an `llm` grader with `focus: trace`. It is the escape hatch for what you
cannot express structurally, and the noisiest of the three, so keep it to the two
or three steps the skill exists to enforce.

ACES keeps security as a metric separate from behaviour checks, so a safety
failure stays visible when task behaviour looks fine, and its dataset generator
auto-appends a security behaviour to every entry the author leaves one off.
Copy that: a guard assertion on every case costs nothing.

## 3. Measuring outcome lift

The ACES protocol, in the parts you need to reimplement it:

**Hold everything fixed but the skill.** Same question, agent, model, task
assets, supporting skills, sandbox, and grading policy. Lift is
`mean(metrics, with) - mean(metrics, baseline)` over the configured metric set.
Absolute scores confound "the skill is good" with "this agent is strong on this
task" and "this judge is lenient". The delta does not.

**Put decoys in the baseline arm.** This is the detail people miss. A baseline
with an empty workspace conflates the skill's content with the fact that any
skill exists to be found, and inflates lift by crediting both. ACES stages the
same author-configured supporting skills in both arms and withholds only the
target, so the agent still has to route in the baseline. For Firehorse, the
baseline arm for `/firehorse:build` keeps `fix-bug`, `map`, and `index` on the
shelf.

**Score six things, not one.** ACES's default set is `security`,
`skill_execution`, and `skill_efficiency` (deterministic), plus `accuracy`,
`goal_accuracy`, and `behavior_check` (LLM or RAGAS judges), each weighted 1/6,
with an outcome-only view averaging `accuracy` and `goal_accuracy`. They map onto
five reader-facing dimensions: Security, Correctness, Discoverability
(skill_execution), Effectiveness, and Efficiency.

**Expect a quarter of your skills to be flat or harmful.** Across the 947 scored
paired cases, composite lift was positive in 689, zero in 171, and negative in
87, median 0.1717, mean 0.2134 with a 95% normal CI of [0.1967, 0.2301]. Absolute
condition means were 0.7460 with the skill and 0.5326 at baseline, and
outcome-only lift was 0.1799. The negatives are the product, not the noise: ACES
sorts them into "never discovered" and "discovered but misused", and only a live
paired run separates those.

**Worked example of a paired case:**

```
evals/build-outcome-planted-bug/
  case.yaml            # execution.prompt, max_turns, timeout_seconds, runs: 10
  graders/
    tests-pass.md      # type: regex, target: trace, pattern for the gate's pass line
    edited-right-file.md  # type: regex, target: files
    read-skill.md      # type: tool_used, tool: Skill, input_match: firehorse:build
    no-force-push.md   # type: regex, target: trace, match: not_contains, "push --force"
    quality.md         # type: llm, focus: files, rubric of three checkable claims
```

Run it with `claude plugin eval . --case build-outcome-planted-bug --runs 10
--ablation with-without --json results.json`. The with-without ablation is the
default whenever a plugin resolves, so the baseline arm is one flag you do not
have to write.

## 4. Run counts, variance, and what to report

Three runs per arm is the floor and the `claude plugin eval` default. Three is
enough to notice a coin flip, not enough to decide adoption.

[Dan Luu's agentic coding notes](https://danluu.com/ai-coding/) are the discipline
here. He ran 50 pairs per task across three tasks to test a prompting mode. The
first benchmark favoured it after one run, reversed after two, and settled after
50 at a modest speedup win with a real cost win. Across tasks the sign flipped:
P(better on outcome) was 0.958 on Optimization 1, 0.17 on Optimization 2, and
0.04 on Game AI, while P(better on cost) stayed at 0.999 or above on all three.
Within one task and one model, one standard deviation between runs on
Optimization 1 was 0.075, larger than the whole spread between the best and worst
model he tested, 1.055 versus 0.986. Run-to-run noise exceeded the model-choice
effect, so any conclusion from a handful of runs is a conclusion about the dice.

What to spend, for a solo maintainer:

- **Discovery cases: 3 runs, all twelve prompts, both shelf sizes.** Activation
  is close to binary and cheap to sample, and short cases make 72 runs per skill
  affordable. Use `-j 4` to run four at once.
- **Outcome cases: 10 runs per arm per fixture, 20 when the arms are within one
  standard deviation.** Below 10 you cannot distinguish a real delta from the
  spread Dan Luu measured.
- **Report the distribution and the per-fixture sign.** ACES calls its own
  headline CI descriptive rather than inferential, because 947 cases cluster by
  skill, harness, and repeated trial, and adds bootstraps over skills
  [0.1898, 0.2350] and over skill-agent cells [0.1880, 0.2385] as cluster checks.
  Among the 88 cells with repeated trials, the median within-cell standard
  deviation of overall lift was 0.0319 against a mean of 0.0699. That gap is the
  long tail one number hides.
- **Cap the spend.** `--max-cost-usd` aborts and reports partial results, and
  it is checked before each run launches, so overrun is bounded to the runs in
  flight. Set it on every invocation.

## 5. The cheapest credible harness

**Use `claude plugin eval`.** It resolves a plugin by path, name, or
`plugin@marketplace` id, adds a no-plugin baseline arm by default under
`--ablation with-without`, runs each case in a sandboxed child with a scratch
home and cwd, and writes an aggregate JSON plus a self-contained HTML report with
per-run scores and grader verdicts. Cases are directories under `evals/` holding
`case.yaml` or `prompt.md` plus `graders/*.md`. Grader types are `regex`,
`tool_order`, `tool_used`, `file_exists`, `llm`, and `baseline`. Case frontmatter
carries `max_turns`, `timeout_seconds`, `allowed_tools`, `model`, and `runs`, and
`--threshold` exits 1 below a score, which is your CI gate.

Its own authoring guidance holds a floor that matches everything above: at least
one should-NOT-fire case per suite, at least one outcome grader per case rather
than only `tool_used`, `runs: 3` minimum, and `--ablation with-without` stays.
Firehorse is a Claude plugin with a manifest at
`packages/firehorse-claude/.claude-plugin/plugin.json`, so this needs no adapter
layer.

The ranking, and why the others lose:

1. **`claude plugin eval`.** Installed, paired by default, trace-level graders,
   no new dependencies. One real limit: it evaluates a plugin, so the comparison
   is plugin-on versus plugin-off rather than one skill withheld from a full
   shelf. A stripped copy of the plugin directory that omits the target skill
   gets ACES's decoy baseline back.
2. **Write a small runner.** Justified only for the shelf-size sweep, which needs
   control over which skills are visible. Roughly 200 lines around the Agent SDK,
   reading `total_tokens` and `duration_ms` off the task completion notification.
3. **Adapt the `fhhs-skills` fixture shape.** Take the committed
   `evals/fixtures/<scenario>/` idea and the planted defects, which
   [the evaluation framework](../../EVALUATION-FRAMEWORK.md) already commits to.
   Do not take its runner: single-arm assertions cannot answer intake's question.
4. **Adapt NVIDIA SkillEvaluator.** The reference implementation of section 3,
   Apache 2.0, genuinely open. It is also Python 3.12 or 3.13 through `uv`, an
   LLM provider credential plus a separate embeddings provider for Tier 2,
   Semgrep, SkillSpector, and Gitleaks for full Tier 1 coverage, and, for the
   Tier 3 live evaluation you want, the Harbor framework and a Docker, local, or
   cloud sandbox holding the agent CLI's own credential. NVIDIA lists support as
   Experimental with no SLA. That is a week of setup for a capability
   `claude plugin eval` gives you in an hour. Read its docs for the method, do
   not adopt its stack.

Borrow the results layout from
[the agentskills.io evaluating-skills guidance](https://agentskills.io/skill-creation/evaluating-skills)
regardless of harness: `iteration-N/<case>/with_skill/` and `without_skill/`, a
`timing.json` per run carrying `total_tokens` and `duration_ms`, and a
`benchmark.json` carrying mean and standard deviation per arm plus the delta.
Those token counts are not persisted anywhere else, so write them when the run
finishes or lose them.

## 6. LLM-as-judge

Use it for the properties you cannot check structurally, and never as the only
grader on a case.

The reliability case is decent in absolute terms. MT-Bench reports human-to-human
agreement of 81 to 82% and GPT-4-to-human agreement of 80 to 85% under standard
non-adversarial conditions, as cited in
[the self-preference bias study](https://arxiv.org/abs/2604.22891): judges match
each other about as well as people do. They also carry position bias that varies
by judge and by task and is not random variation.

Four rules keep it honest:

- **Vote and take the majority.** `claude plugin eval`'s `llm` grader polls the
  judge several times and records the individual votes in `judge_votes`, passing
  on a majority. Keep the votes, so a 2-1 verdict reads differently from a 3-0.
- **Write rubrics as concrete checkable claims,** the way ACES's
  `expected_behavior` sentences read: "the bar chart has labeled axes" grades,
  "the output is good" does not. Require quoted evidence for a pass.
- **Keep judge inputs short.** Long focus files make judges noisy, and the runner
  warns above roughly 8,000 characters. Prefer `regex` over a large artifact.
- **Blind any version-versus-version comparison,** so the judge does not know
  which arm it is reading.

And keep the framework's number in view: structural scores correlated with
LLM-judge rubric scores at Spearman rho = 0.14 and Pearson r = 0.08 over 145 real
skills, where 94.5% cleared the default 70-point gate and 48.9% reached 80. Run
the scan for authoring defects, run the live trial for value.

## What Firehorse should build first

1. **A discovery suite for the eight shipped units,** the six `/firehorse:*`
   commands and the two skills under
   `packages/firehorse-claude/skills/`. Twelve prompts each
   under `evals/discovery/<skill>-<bucket>-NN/`, `max_turns: 2`,
   `runs: 3`, a `tool_used` activation grader, and `min: 0, max: 0, arm: both`
   on every negative control. Report the whole-repo confusion matrix. This is
   first because it answers the actual complaint, it is the cheapest suite to
   run, and it needs no fixtures.
2. **The near-neighbour negatives, as their own gate.** Two per skill, naming a
   scenario another Firehorse skill owns. Wire `--threshold` into CI so a
   description edit that starts stealing another skill's prompts fails the
   build. This is the regression class that will otherwise recur silently.
3. **One paired outcome fixture with a planted defect,** 10 runs per arm, graded
   by the fixture's own test gate plus one trajectory check and one guard. One
   fixture that produces a defensible number beats six that produce opinions.
4. **A token and wall-clock record on every run,** written at completion. The
   realistic win here is flat quality at lower cost, unreportable after the fact.
5. **The shelf-size sweep, and the small runner it needs.** Deferred to last
   because the ACES stress result already tells you the shape, and because it is
   the only item that requires code rather than case files.

## Open questions

- **How do you withhold one skill rather than the whole plugin?** The
  stripped-copy workaround is untested here. If the copy changes the manifest or
  the skill listing in a way the agent notices, the arms are not comparable.
- **Does the sandboxed eval child see the same skill shelf as a real session?**
  A real session carries user-level skills, plugin skills from other
  marketplaces, and MCP tools. If the eval child sees only the plugin under
  test, every discovery number it produces is an isolation-mode number, and the
  routing premium is exactly what you are failing to measure.
- **Do discovery results transfer across models?** ACES ran four harnesses but
  reports lift per skill-agent cell, not activation per model. A description
  tuned against one model's routing may not hold.
- **What is the activation signal for a slash command?** If a command body is
  only ever entered by the user typing it, there is no routing decision to
  measure and the discovery suite shrinks to the two skills. Resolving this
  decides how much of item 1 is real work.
- **Does capping `max_turns: 2` bias activation?** An agent that would have
  reached for the skill on turn three reads as a miss. Worth one calibration run
  at a higher cap.
- **What replaces `--threshold` for a distribution?** A single threshold on a
  mean score reintroduces the summary-number problem section 4 warns about.
