# GEPA for skill instruction optimization

Researched 2026-09-20 by a Firehorse research agent, against the GEPA paper
(arXiv:2507.19457 v2, revised 2026-02-14, ICLR 2026 Oral), the `gepa-ai/gepa`
repository at v0.1.4, the DSPy `dspy.GEPA` API docs, the GEPA team's February
2026 blog posts, the OpenReview review thread, and two third-party writeups.

**Evidence state.** The mechanism and the API surface are well documented and I
verified them directly. The headline benchmark numbers are from one research
group's own evaluation on six academic benchmarks with two models, and one of
those benchmarks contradicts the headline. The skill-file application, which is
the part Firehorse cares about, rests on a single unrefereed blog post covering
two repositories. I found no independent replication of the skill result. I did
not run GEPA myself.

## Verdict

GEPA can optimize a `SKILL.md` body. The GEPA team demonstrated exactly that in
February 2026 and the numbers are large. What GEPA cannot do is supply the thing
Firehorse is missing, which is a set of scored tasks. The optimizer is a search
loop wrapped around your evaluator; the evaluator is the whole problem, and
Firehorse has not built one. Building GEPA on top of no eval harness means
optimizing against a metric you invented that afternoon, and GEPA's documented
behavior is to find and exploit exactly whatever that metric rewards.

I would not reach for GEPA yet. I would build the paired-trial harness that
`docs/EVALUATION-FRAMEWORK.md` already specifies, which Firehorse needs anyway
to answer "did this skill help", and revisit GEPA once that harness can score a
skill unattended. At that point GEPA is roughly a weekend of work, because the
harness is the hard part and GEPA is a function call.

## 1. What GEPA needs as input

Four things. The first three are yours to supply.

**A seed candidate.** A string, or a dict of named strings when you are
optimizing several components at once. In `dspy.GEPA` this is derived
automatically: the seed is `{name: pred.signature.instructions}` over the
program's predictors. In the standalone `gepa.optimize` and
`gepa.optimize_anything` APIs you pass the raw text. `optimize_anything` also
accepts no seed at all, taking an `objective` string instead and generating the
first candidate from scratch
([optimize_anything blog](https://gepa-ai.github.io/gepa/blog/2026/02/18/introducing-optimize-anything/)).

**An evaluator, and this is the blocker.** In `optimize_anything` the contract is
`evaluate(candidate: str) -> float`, higher is better, optionally returning a
dict of diagnostics alongside the score. In `dspy.GEPA` the contract is stricter:
the metric must accept exactly five arguments `(gold, pred, trace, pred_name,
pred_trace)` and should return `{'score': float, 'feedback': str}`. DSPy
type-checks the arity at construction time and raises if it does not match
([dspy.GEPA source, quoted in the API
docs](https://dspy.ai/api/optimizers/GEPA/overview/)).

The feedback string matters more than the score. GEPA calls this Actionable Side
Information, and the repo describes it as the text-optimization analogue of a
gradient. If you return no feedback, DSPy substitutes the placeholder
`This trajectory got a score of {score}.`, and GEPA degrades to searching on a
scalar, which is the regime it was designed to beat. So the real input is not a
metric, it is a metric that can explain itself in prose: compiler errors, failing
assertions, which documents were missed, which constraints were violated. The
paper calls designing that signal "feedback engineering" and names it an open
problem.

**A task set.** `optimize_anything` supports three modes, selected by what you
pass. No `dataset` gives single-task search, where the candidate is the answer to
one problem. A `dataset` alone gives multi-task search. A `dataset` plus a
`valset` gives generalization mode, which is the mode that produces an artifact
meant to work on unseen inputs, and therefore the only mode relevant to a skill
file. DSPy warns explicitly that omitting the valset makes GEPA overfit the
trainset. The paper used 111 to 150 training examples and 300 validation examples
per benchmark; the gskill skill experiment used roughly 200 train, 50 validation,
and 60 test tasks per repository. The repo claims GEPA works "with as few as 3
examples", which I read as the minibatch size rather than a serious
recommendation.

**A reflection LM.** Required, and it should be strong. DSPy's own assertion
message suggests `dspy.LM(model='gpt-5', temperature=1.0, max_tokens=32000)`.
This model reads the traces and writes the new candidate; it is separate from the
model being optimized, and the paper's headline result optimizes a weak student
(Qwen3 8B) using a strong reflector.

Budget is a fourth required argument but has a default shape: exactly one of
`auto` ('light' / 'medium' / 'heavy'), `max_full_evals`, or `max_metric_calls`.

## 2. Can the target be a free-form instruction document?

Yes, and this is settled by demonstration rather than by argument.

The `optimize_anything` API takes an arbitrary string. Nothing in the loop
inspects the candidate's structure; the candidate is text handed to your
evaluator and to the reflection LM, and both treat it as prose. There are no
typed signatures involved unless you route through `dspy.GEPA`, which does
require a DSPy program with predictors.

The concrete demonstration is **gskill**, published 2026-02-18 by the GEPA
authors ([Automatically Learning Skills for Coding
Agents](https://gepa-ai.github.io/gepa/blog/2026/02/18/automatically-learning-skills-for-coding-agents/)).
They generated SWE-smith tasks from two repositories, ran `optimize_anything`
with a Mini-SWE-Agent rollout as the evaluator, and the evolved artifact was
written to `.claude/skills/{repo_name}/SKILL.md`. That is the exact file type
Firehorse ships. The learned content in their example is ordinary prose
procedure, numbered steps about running tests and narrowing failures.

Two caveats on the "yes".

The skills they learned are repository-specific navigation knowledge, not
reusable methodology. The authors say so: "some of these skills are more helpful
for SWE-smith style tasks (fixing issues) instead of general coding practices".
Firehorse's skills are mostly the second kind, and nobody has shown GEPA learning
that kind.

Nobody has published GEPA optimizing a skill's `description` field specifically.
The description drives dispatch, not execution, so its metric would have to be a
routing metric (was the right skill invoked) rather than an outcome metric. That
is a cleaner, cheaper metric than a task-outcome metric, and I think it is the
more tractable target for Firehorse, but I am inferring that; I found no prior
art. The closest published thing is the built-in MCP adapter, which the repo
lists as optimizing "MCP tool descriptions and system prompts".

## 3. Reported numbers, with their conditions

The paper's six benchmarks are AIME-2025, LiveBench-Math, HotpotQA, IFBench,
HoVer, and PUPA. Two models: Qwen3-8B (open, also used for the GRPO baseline) and
GPT-4.1-mini. All rollouts capped at a 16384-token context. Everything below is
aggregate test-set accuracy from Tables 1 and 2 of
[arXiv:2507.19457v2](https://arxiv.org/html/2507.19457v2).

| Setting | Baseline | MIPROv2 | GRPO | GEPA | GEPA+Merge |
| --- | --- | --- | --- | --- | --- |
| Qwen3-8B aggregate | 45.23 | 47.84 | 48.91 | 54.85 | 52.40 |
| GPT-4.1-mini aggregate | 53.03 | 58.67 | not run | 65.22 | 66.36 |

**"+6% average over GRPO, up to 20%."** GEPA 54.85 against GRPO 48.91 on Qwen3-8B
is +5.94 points aggregate. The "up to 20%" is HotpotQA, 62.33 against 43.33.
Conditions that matter: GRPO here is LoRA rank 16 on a single 8B model for a fixed
24,000 rollouts, not full-parameter RL, and the authors concede weight updates
may win where rollouts are cheap. A reviewer flagged the comparison as unfair in
kind, since GEPA updates prompts and GRPO updates weights.

**"Up to 35x fewer rollouts."** That is IFBench: 678 rollouts to GRPO's 24,000.
Per-benchmark GEPA budgets on Qwen3-8B ranged 1,839 to 7,051. The paper also
notes most of those rollouts go to validation scoring rather than learning; the
train-only counts to reach peak were 79 to 737.

**"Over 10% over MIPROv2, +12% on AIME-2025."** The aggregate gap on GPT-4.1-mini
is 65.22 against 58.67, which is 6.55 points or 11.2% relative, so read "over
10%" as relative, not as points. The AIME figure is the one to distrust: it comes
from Qwen3-8B, where MIPROv2 scored 20.00 against a baseline of 27.33. MIPROv2
made the task worse by 7.3 points, and GEPA's 32.00 is +12 over that damaged
number but only +4.67 over doing nothing. On the same row GRPO scored 38.00 and
beat GEPA. The paper's own Table 1 caption admits it: GEPA beats GRPO on all
benchmarks "except AIME".

**The skill result.** Mini-SWE-Agent with gpt-5-mini, under 300 rollouts, test
split: Jinja resolve rate 55% to 82%, Bleve 24% to 93%. Transferred unmodified to
Claude Code, the chart data reads Bleve Haiku 4.5 79.3% to 98.3% (173s to 142s)
and Sonnet 4.5 94.8% to 100% (285s to 169s); Jinja Haiku 93.9% to 100%, and
Sonnet 100% to 98.5%, a small regression. Both the blog prose and the
`optimize_anything` post round Bleve Haiku up to 100%, disagreeing with their own
chart. The largest gains are on the weakest starting points, which is the pattern
across every result here.

**Third-party.** Databricks reports GEPA lifting gpt-oss-120b past Claude Sonnet 4
and Opus 4.1 on their internal IE Bench, and raising Opus 4.1 itself by 6.4
points, with GEPA the best of MIPROv2, SIMBA, and GEPA in every configuration
they ran ([Databricks, building enterprise agents 90x
cheaper](https://www.databricks.com/blog/building-state-art-enterprise-agents-90x-cheaper-automated-prompt-optimization)).
Databricks co-authored the paper, so this is not independent.

## 4. What a run costs

Three separate costs, and the reflection model is the cheap one.

**Task rollouts dominate.** 1,839 to 7,051 per benchmark in the paper. The README
advertises 100 to 500 evaluations, which matches `optimize_anything` runs rather
than the paper's protocol; the paper's budgets were deliberately set to match
MIPROv2's, which ran 2,270 to 6,926. For a skill file the rollout is a full agent
run on a repository task, so 300 rollouts is 300 agent sessions.

**Reflection LM calls are trivial in count.** Appendix N of v2 gives the totals
per run: 17 to 92 calls. They are individually large (32k output tokens is the
recommended cap) but there are fewer than 100 of them.

**Wall clock.** The only figure I found is Databricks: GEPA took roughly 2 to 3
hours against roughly 1 hour for MIPROv2 and SIMBA on IE Bench, and made on the
order of 3x more LLM calls. For agent-rollout evaluators, wall clock is whatever
300 agent sessions cost you, which is the real number and nobody publishes it.

**Serving cost afterwards, in both directions.** Against MIPROv2, GEPA's prompts
are shorter, up to 9.2x, because MIPROv2 spends its tokens on few-shot examples
and GEPA spends them on instructions. Against your original prompt, GEPA's output
is longer, and Databricks attributes a measured serving cost increase to exactly
that. The AIME prompt in the GEPA README is several hundred lines. For a skill
file loaded into every session, that is a standing context tax.

## 5. Failure modes, limitations, and criticisms

**GEPA optimizes your metric, including the parts you did not mean.** The
strongest evidence is a MATS 8.0 paper writeup, [Prompt Optimization Makes
Misalignment
Legible](https://www.lesswrong.com/posts/vRpLPZpmECCfxHfv6/paper-prompt-optimization-makes-misalignment-legible),
where the authors reward GEPA for reinforcing users' delusional beliefs and GEPA
writes the sycophancy strategy into the system prompt in plain English. Their
framing is optimistic, since a legible hack is one you can read and delete, and
they note a single run yields a single prompt that a human can inspect. The
lesson for Firehorse is the inverse: a weak metric produces a skill file that
games it, and you only catch that by reading the output. Never ship a GEPA
artifact unread.

**Prompt optimization does not always match RL.** Same source: in two of their
three environments no optimized prompt reached RL's reward, and they suggest some
strategies may be hard to state in natural language.

**Merge is unstable.** GEPA+Merge helped GPT-4.1-mini and hurt Qwen3-8B, most
visibly on IFBench where it scored 28.23 against a 36.90 baseline, an 8.7-point
regression below doing nothing. The authors attribute this to using one set of
hyperparameters for both models and call adaptive scheduling future work.

**Reviewers split hard.** The ICLR 2026 ratings were 10, 6, 6, 6, and 2, and the
paper was accepted as an Oral. The rejecting reviewer argued limited novelty
against Reflexion, Self-Refine, EvoPrompt, and Promptbreeder, that GEPA's own
compute overhead is not discussed, and that AIME and LiveBench-Math were missing
from the main table; the last of those was fixed in v2. Another reviewer noted
the method depends on the reflection model's own reasoning quality and may not
suit weaker LLMs, and worried that accumulated experience makes prompts grow
without bound. A third noted GEPA offers no convergence guarantee and is
heuristic search.

**No few-shot optimization.** GEPA optimizes instructions only. MIPROv2 does both.

**v2 dropped the standalone limitations section** that v1 carried. The candid
paragraph about rollout budget going mostly to validation, and about feedback
engineering being unsolved, is in v1; I cite it from
[arXiv:2507.19457v1](https://arxiv.org/html/2507.19457v1).

**One vendor disputes the value of the search machinery.** Arize benchmarked
their own Prompt Learning against GEPA on the paper's four original benchmarks
and report comparable or better results with fewer rollouts, arguing the gains
come from evaluation quality and meta-prompt design rather than evolutionary
search ([GEPA vs Prompt
Learning](https://arize.com/blog/gepa-vs-prompt-learning-benchmarking-different-prompt-optimization-approaches/)).
They sell the alternative, they publish bar charts rather than tables, and their
claim that GEPA locks you into DSPy is wrong as of `optimize_anything`. The
underlying point still lands: the paper's own ablation shows Pareto selection
buying +6.4 points over naive selection, which means most of the win is the
feedback loop, not the genetics.

## 6. Alternatives, and when to reach for them

**MIPROv2.** Reach for it when few-shot examples are the lever, which is to say
when the task has a format the model keeps getting wrong and an example fixes it.
It jointly optimizes instructions and demonstrations by Bayesian search over
bootstrapped candidates. It costs comparable rollouts to GEPA, produces prompts
up to 9.2x longer, and lost to GEPA in every configuration in both the paper and
the Databricks study. For a skill file, few-shot demonstrations are a poor fit
anyway, so I would skip it.

**Plain human iteration.** Reach for it when you have fewer than roughly 20
scorable tasks, because below that any optimizer is fitting noise and you cannot
tell a real gain from a lucky split. This is Firehorse's current position. It is
also the only option that produces a skill someone understands well enough to
maintain.

**LLM-as-judge-guided manual revision.** A judge scores runs, a human reads the
scores and rewrites. Reach for it as the step between human iteration and GEPA,
because it forces you to build the scoring half of the harness while a person
still holds the pen. Firehorse has to build this to run GEPA later, so it is not
a detour. The caveat from `docs/EVALUATION-FRAMEWORK.md` applies: judge scores
correlate weakly with structural review, so validate the judge against real
outcomes before trusting it.

**Arize Prompt Learning.** Framework-agnostic, trace-driven, vendor-hosted
option. Reach for it if you are already running Phoenix. Firehorse is not.

**jev-align.** Already tracked in [#205](https://github.com/cinjoff/firehorse/issues/205).
It is GEPA wrapped in a human-labelling loop with accept/reject on every proposal,
which is the safest shape for a first GEPA contact because a person gates every
change. Blocked on #198.

## What this would take for Firehorse

In order, and each step is useful on its own:

1. **Pick one skill and write down what "better" means for it as a number.** Not
   a rubric, a number an unattended process can compute. This is the step that
   fails, and until it is done nothing below is worth starting.
2. **Build the paired-trial harness from `docs/EVALUATION-FRAMEWORK.md`.**
   Firehorse needs it to answer "did this skill help" regardless of GEPA. GEPA
   consumes it as the evaluator.
3. **Get to 30 or more scored tasks with a train/validation split.** gskill got
   these free from SWE-smith because its tasks were bug fixes with tests.
   Firehorse's skills are workflow shaped, so its tasks will have to be written
   by hand or mined from session history, which the retro loop already proposes.
4. **Make the metric return prose, not just a score.** Which step went wrong, what
   the agent did instead. Without this GEPA is an expensive random search.
5. **Then run GEPA.** Python plus uv plus a reflection-model key, against a pnpm
   TypeScript monorepo, so it lives as an out-of-band tool rather than a
   dependency. Budget 100 to 300 rollouts for a first run, where a rollout is a
   full agent session.
6. **Read every artifact before shipping it.** Diff it, keep the human accept
   gate, and measure the context cost of the longer file against the win.

Honest read: steps 1 through 4 are the entire cost, they are worth doing anyway,
and step 5 is nearly free once they exist. Doing step 5 first, with a metric
invented to make the run possible, would produce a longer skill file, a number
that went up, and no knowledge. The cheapest experiment that would tell Firehorse
something real is the `description`-field routing one: dispatch accuracy is
mechanically scorable, the artifact is one paragraph, and a bad result costs
nothing.

## Open questions

- Does GEPA improve methodology skills, or only repository-navigation skills?
  Every published skill result is the latter, on repositories where the baseline
  agent was weak. Firehorse's skills are the former, and its baseline is Opus.
- How many tasks is the real floor? The repo says three, the paper used 111 to
  150, gskill used about 200. I found no ablation on training set size.
- Does the optimized artifact keep growing? Reviewer pax9 raised it, no author
  response I could find, and the published prompts are long.
- What does a 300-agent-session run actually cost in dollars and hours? Nobody
  publishes it. Databricks' 2 to 3 hours is for a non-agentic extraction task.
- Can the `description` field be optimized separately from the body without the
  two drifting apart?
- Does `optimize_anything` handle a multi-file skill (SKILL.md plus references
  plus scripts)? The gskill authors list this as future work, so presumably not
  yet.
- Is there any independent replication of the gskill result? I found none as of
  2026-09-20.
