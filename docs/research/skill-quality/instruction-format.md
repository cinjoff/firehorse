# Instruction format: what makes a skill fire, and what makes it get followed

Researched 2026-09-20. Scope: how the wording and format of an agent skill's frontmatter and
body affect two separate outcomes, whether the skill is **discovered** (selected at the
right moment) and whether it is **followed** (obeyed fully once its body is in context).

These are different failure modes with different fixes. A skill that never fires is a
`description` problem. A skill that fires and then gets half obeyed is a body problem.
Treating them as one problem is the most common mistake in skill authoring, and it is why "I
rewrote the description and it still skips step 4" is such a familiar complaint.

State of the evidence: discovery mechanics are documented and firm; discovery *writing*
advice is mostly assertion plus community testing, with a published optimization loop but no
published win rates. The following side has real measurements, but mostly from benchmarks
stacking far more instructions than a skill carries, so they give the shape of the curve,
not the value at the point you care about. Format has the most numbers and the least usable
verdict.

## How to read the labels

Every claim below carries one of these:

- **[Measured]** a number from a paper, with its model and task attached.
- **[Asserted]** Anthropic or a spec states it as guidance, no published numbers.
- **[Mechanics]** a documented property of the runtime, verifiable from the spec.
- **[Folklore]** community practice or single-team testing, reported as such.

## 1. Discovery: the mechanics

**[Mechanics]** At session start the agent loads only the `name` and `description` from each
skill's YAML frontmatter into the system prompt. Nothing else. The body of `SKILL.md` is
read later, by a tool call, and only if the model decides the skill is relevant. Reference
files under `references/` cost zero context until something reads them. This is what
progressive disclosure means in practice, and it has a hard consequence: the `description`
carries the entire burden of getting the skill selected. No amount of quality in the body
can rescue a description that does not match.

**[Mechanics]** The frontmatter limits, from the Claude docs and the [Agent Skills
specification](https://agentskills.io/specification):

| Field | Required | Limit |
|---|---|---|
| `name` | yes | 64 characters, lowercase letters, numbers, hyphens |
| `description` | yes | 1 to 1024 characters, no XML tags |
| `license` | no | short string |
| `compatibility` | no | intended product, packages, network needs |
| `metadata` | no | string to string map |
| `allowed-tools` | no | space separated, marked experimental |

**There is no `when_to_use` field.** The string `when_to_use` appears nowhere in the
specification. Some ecosystems have invented it; if you write it into Firehorse frontmatter
it is inert metadata that no loader reads, and the trigger conditions you put there never
reach the system prompt. Put trigger conditions in `description`.

**[Mechanics]** I found no documented truncation of the listing text below 1024 characters;
Anthropic's own `xlsx` description runs roughly 900 characters. **[Asserted]** Write in
third person, on the docs' stated mechanism that the description is injected into the system
prompt and inconsistent point of view "can cause discovery problems." No numbers.

**[Asserted]** The one mechanic that most likely explains your MCP skill problem comes from
agentskills.io: agents typically consult skills only for tasks that need capability beyond
what they can already do. A request like "read this PDF" may not trigger a PDF skill however
well the description matches, because the agent believes it can handle that with basic
tools. This is exactly the codebase-memory case. Asked to "explore the codebase," Claude already
has Grep, Glob, and Read, judges itself competent, and never reaches for the graph. The
skill is not losing a matching contest. It is losing a necessity contest. The fix is not
more keywords, it is a description that asserts the skill is the correct route for a task
the agent thinks it can improvise, and a body that is worth having won.

## 2. Discovery: the writing

The sanctioned advice, from [optimizing skill
descriptions](https://agentskills.io/skill-creation/optimizing-descriptions):

1. **Use imperative phrasing.** "Use this skill when..." beats "This skill does...". The
   agent is deciding whether to act.
2. **Describe user intent, not implementation.** The agent matches against what the user
   asked for, not your internals.
3. **[Asserted] Err on the side of being pushy.** Explicitly list contexts where the skill
   applies, including ones where the user does not name the domain. The page's own example
   phrasing is to add "even if they don't explicitly mention 'CSV' or 'analysis.'"
4. **Add negative boundaries.** If near-miss tasks are stealing or leaking triggers, say
   what the skill is not for.

The under-triggering tendency is real enough that the official guidance is "be pushy," which
is not advice you give about a system that over-fires. The documented remedy is an eval
loop, not a rewrite. Build roughly 20 queries, 8 to 10 that
should trigger and 8 to 10 near-misses that should not. Run each three times, because
triggering is nondeterministic, and compute a trigger rate with 0.5 as the pass threshold.
Split train (60%) and validation (40%) and pick the description with the best *validation*
rate, often not the last one you wrote. The `skill-creator` skill in
[anthropics/skills](https://github.com/anthropics/skills) automates this. The best test
queries are the ones where the skill would help but the connection is not obvious; if the
query names what the skill does, anything fires.

### Before and after, codebase exploration

Before, a summary of the skill:

```yaml
description: Codebase knowledge graph for structural code queries.
```

This fails twice: it describes the artifact rather than the moment, and gives the agent no
reason to prefer the graph over grep. After:

```yaml
description: >
  Use this skill for any structural question about how this codebase fits
  together: exploring or orienting in an unfamiliar repo, tracing what calls
  a function or what a function calls, following a call chain across files,
  finding dependents before a refactor, impact analysis, locating dead or
  unused code, and auditing fan-out. Use it whenever the user says "explore
  the codebase", "how does X work", "what calls this", "trace this", "who
  uses this", or "what breaks if I change this", even when they do not
  mention the graph or the index. Prefer this skill over ad-hoc grep for
  these questions: grep finds text, the graph finds callers and callees, and
  answers assembled from grep alone are routinely incomplete. Do not use it
  for literal string search, for prose and config files, or for editing code.
```

That is roughly 800 characters, inside the limit. It names situations rather than
capabilities, quotes the user's likely phrasing, states the negative boundary, and, most
importantly, argues against the agent's default. That last sentence is the part most
descriptions omit and the part this case needs.

### One real disagreement worth knowing

The Claude docs say a description should include both what the skill does and when to use
it. obra/superpowers says the opposite, in bold: the description should describe triggering
conditions **only**, never the workflow.

**[Folklore, with a reported mechanism]** Superpowers reports that when a description
summarized the workflow, the agent followed the description instead of reading the skill. A
description saying "code review between tasks" produced one review when the skill's
flowchart specified two. Removing the summary fixed it. Their framing: a workflow summary
creates a shortcut the agent takes, and the body becomes documentation it skips.

I find this credible and it is a discovery/following crossover: an overly informative
description damages following. Anthropic's own shipped skills lean the superpowers way in
practice. The `pdf` and `xlsx` descriptions enumerate triggering situations at length and
describe process not at all.

My read: enumerate *situations* generously, describe *procedure* not at all.

## 3. Following: why loaded instructions get partially obeyed

### Instructions decay with density, non-linearly

**[Measured]** IFScale ([arXiv:2507.11538](https://arxiv.org/abs/2507.11538), 20 models, 500
keyword-inclusion instructions on a business-report writing task): the best frontier models
reach only 68% accuracy at 500 instructions. Three shapes appear. Threshold decay,
near-perfect until a cliff, in reasoning models like o3 and gemini-2.5-pro, holding past 150
instructions. Linear decay in gpt-4.1 and claude-3.7-sonnet. Exponential decay in gpt-4o and
llama-4-scout, bottoming out at 7 to 15%. Do not over-apply it: one synthetic keyword task
at a density no skill reaches. Take the shape only.

**[Measured]** Much closer to skill scale:
[arXiv:2608.02639](https://arxiv.org/abs/2608.02639) stacks 24 verifier-checked instructions
one to twenty at a time on Claude Sonnet 4.6, GPT-5-mini, and Gemini 2.5 Flash. Follow rate
falls from 96% to as low as 20%, non-linearly. The cause is reproducible *pairwise
conflicts*: a single "output JSON" constraint is jointly unsatisfiable with nine others.
This is the finding I would act on. At twenty instructions, which many `SKILL.md` bodies
exceed, following is already degrading, driven by instructions that fight each other rather
than by count. Their remedy, an LLM pass rewriting the stacked prompt, recovers up to 11
points for weaker models and leaves stronger ones unchanged.

**[Measured]** [arXiv:2607.19257](https://arxiv.org/abs/2607.19257) scales rule count from
10 to 160 across five models and four formats: the perfect-response rate collapses to zero
by N=80 for every model, format, and placement. Perfect compliance is not a thing you get at
high rule counts by formatting your way there.

### Position: earlier is better, but only in a middle band

**[Measured]** IFScale computes a primacy ratio, errors in the last third over errors in the
first third. Above 1.0 means later instructions get violated more. The ratio starts near 1.0
at low density, **peaks around 150 to 200 instructions**, then converges back toward 1.0 to
1.5 at extreme density as models fail uniformly. Claude-3.7-sonnet peaks at 2.67. So
front-loading matters most when a model is starting to struggle, and a normal-sized
`SKILL.md` sits below that band. Put the undroppable rule first anyway, it costs nothing,
but do not expect ordering to rescue an overloaded skill.

### Negative instructions carry a mechanical cost

**[Measured]** [arXiv:2601.08070](https://arxiv.org/abs/2601.08070), a single-author
preprint, on **Qwen2.5-7B-Instruct only**, n=40,000. Violation probability of a "do not use
word X" constraint follows a logistic curve in the model's intrinsic probability of the
token. Under the logit lens the suppression signal is present but weaker in failures,
dropping target probability 5.2 points versus 22.8 in successes. 87.5% of violations are
*priming failures*: naming the forbidden word activates its representation rather than
suppressing it. Take the mechanism, discount the magnitude. One 7B open-weights model,
because mechanistic interpretability needs open weights, and the authors decline to claim
universality. It licenses no number for Opus, but it supports the rule that naming a thing
to forbid it is a weak move, and it converges with the superpowers finding below.

### Prohibition versus recipe, the finding I would actually bet on

**[Folklore, with head-to-head testing]** obra/superpowers reports wording tests on
dispatch-prompt guidance where the prohibition arm ("don't restate the spec") produced
clearly more of the unwanted content than the recipe arm, with fully separated
distributions, and trended worse than the no-guidance control. Telling the agent not to do
something made it do it more than saying nothing at all. Their matching rule is the single
most useful artifact I found on the following side:

| Baseline failure | Right form | Wrong form |
|---|---|---|
| Knows the rule, skips it under pressure | Prohibition, plus a rationalization table and red flags | Soft guidance ("prefer", "consider") |
| Complies, but the output has the wrong shape | Positive recipe: state what the output IS, its parts, in order | Prohibition list |
| Omits a required element from output it already produces | Structural: a REQUIRED slot in the template it fills | Prose reminders near the template |
| Behavior should depend on a condition | Conditional on an observable predicate | Unconditional rule plus exemption clauses |

Two corollaries from the same tests, both counterintuitive:

- **No nuance clauses.** Appending one "unless it matters" clause to a winning recipe
  degraded it from consistent to noisy.
- **Exemption clauses do not scope.** "This limit does not apply to code blocks" still
  suppressed code blocks. Restructure so the rule cannot reach the exempt part, rather than
  carving out.

### Over-constraining costs reasoning

**[Measured]** [arXiv:2408.02442](https://arxiv.org/abs/2408.02442) finds a significant
decline in reasoning under format restrictions, and stricter constraints degrade reasoning
more. **[Measured]** [arXiv:2604.03616](https://arxiv.org/abs/2604.03616) locates the cost:
most of the accuracy loss comes from the format-*requesting instruction* in the prompt,
before any decoder constraint applies. Sampling bias is a fraction. So the ask itself is
the tax: a `SKILL.md` that specifies output shape in elaborate detail spends reasoning to
buy that shape.

## 4. Format: does structured syntax beat prose?

Honest answer: **the spread is real and often large, the winner is task and model specific,
and nobody has published a ranking that transfers.** Anyone who tells you Markdown beats
prose for Claude is repeating folklore.

**[Measured]** [arXiv:2411.10541](https://arxiv.org/abs/2411.10541), OpenAI GPT models, four
formats (plain text, Markdown, YAML, JSON), six benchmarks:

- GPT-3.5-turbo varies **up to 40%** on a code translation task by template. That is a
  relative figure on one task, not a universal 40 points.
- The widely repeated "42" is this: on MMLU international law, GPT-35-turbo-16k-0613
  accuracy rises 42% for JSON over Markdown. That is **42% relative**. The full-table MMLU
  numbers are 59.7 JSON versus 50.0 Markdown, so about **9.7 percentage points**. Cite the
  points, not the 42.
- Direction flips by model family. **GPT-3.5 prefers JSON; GPT-4 prefers Markdown.** On
  MMLU, GPT-4 scores 81.2 Markdown versus 73.9 JSON.
- The largest single gap: HumanEval on GPT-4-32k, 76.2 plain text versus 21.95 JSON.
- Format preference barely transfers across families, IoU often below 0.2, while sub-series
  of one family agree, IoU above 0.7.
- Larger models are more robust and not immune. GPT-3.5 gave identical answers between
  Markdown and JSON only 16% of the time.

**[Measured]** [arXiv:2310.11324](https://arxiv.org/abs/2310.11324), FormatSpread, ICLR
2024: up to **76 accuracy points** spread from meaning-preserving formatting changes on
**LLaMA-2-13B**, few-shot. The caveat people drop is that sensitivity persists as model
size, shot count, and instruction tuning increase. A 13B open model in 2023 is no proxy for
Opus; carry forward the method, report a range rather than one number.

**[Measured]** The strongest qualification of "structure costs reasoning" is
[arXiv:2606.09410](https://arxiv.org/abs/2606.09410), "Capacity, Not Format." With
information-matched prose controls, the penalty depends on spare capacity. Sonnet on
MATH-Hard: 88.7±4.0% JSON versus 89.3±1.7% CoT, no meaningful degradation. Haiku drops 36.2
points under standard budgets, largely truncation; GPT-4o-mini still drops 28.0 points with
extended budgets, so it is capacity competition, not token exhaustion. Frontier immunity is
only partial: Opus 4.7 on AIME goes 96.2% to 91.0% under JSON, 5.3 points. Reasoning freely
first and formatting after recovers most of it.

**[Measured]** On Markdown specifically,
[arXiv:2607.19257](https://arxiv.org/abs/2607.19257) crossed four formats across five
models: **no model shows a reliable Markdown advantage**, one 35B model prefers plain text,
*placement* (system prompt versus user turn) has effects at least as large as format at
N=160 with model-specific direction, and structured formats cost 22 to 37% more tokens than
plain text.

**[Asserted]** Anthropic's prompt engineering guidance recommends XML tags to separate
instructions, context, examples, and input, on the stated mechanism that it reduces
misinterpretation when a prompt mixes content types. No published numbers. Sound where
scoped, which is *delimiting heterogeneous content*, and not a claim that XML-structured
prose reasons better.

**Verdict.** Use light structure to make a skill navigable: headings to skim by, tables for
lookups, fenced code for exact tokens. Do not switch a skill to JSON or heavy XML hoping for
accuracy; that evidence is a GPT-3.5-era artifact that reverses on GPT-4. Where a skill
dictates output shape, let the model reason before it formats.

## 5. What strong skill repos actually do

Real frontmatter from [anthropics/skills](https://github.com/anthropics/skills):

`pdf`, about 400 characters: imperative opener, exhaustive situation list, then a catch-all,
"If the user mentions a .pdf file or asks to produce one, use this skill."

`xlsx`, about 900 characters, is the best exemplar in the repo. It opens "Use this skill any
time a spreadsheet file is the primary input or output", enumerates verbs and extensions,
then does two things most skills skip:

> Trigger especially when the user references a spreadsheet file by name or
> path, even casually (like "the xlsx in my downloads")

> Do NOT trigger when the primary deliverable is a Word document, HTML
> report, standalone Python script, database pipeline, or Google Sheets API
> integration, even if tabular data is involved.

The shape to copy: imperative opener, enumerated situations including casual mentions,
explicit non-triggers naming the near-misses it competes with. What is absent: any
description of how the skill works.

Bodies in the same repo are short and dispatching. `pdf` opens by pointing elsewhere, "see
REFERENCE.md. If you need to fill out a PDF form, read FORMS.md and follow its
instructions." `xlsx` opens with a three-row task-to-approach table. Both are navigation,
not content. **[Asserted]** The docs cap the body at 500 lines and tell you to ask of each
paragraph, "does this justify its token cost?"

obra/superpowers takes a different bet: skill writing as TDD. Run the scenario without the
skill, record the agent's rationalizations verbatim, write against those specific ones,
re-test, close new loopholes. Its claim, "if you didn't watch an agent fail without the
skill, you don't know if the skill teaches the right thing," is the agentskills.io trigger
eval applied to following instead of discovery.

## 6. What matters, and what is noise

My read, ordered by how much I would spend on each.

**Matters a lot.**

1. *The necessity contest.* Skills lose to the agent's belief that it can already do the
   task. Nothing else here is as big for a skill competing with a built-in tool, and it is
   invisible to keyword tuning.
2. *Prohibition versus recipe.* Fully separated distributions head to head, with the
   prohibition arm losing to saying nothing. Cheap to fix, large effect, and most skills get
   it backwards.
3. *Instruction conflict.* 96% to 20% at twenty stacked instructions. A long skill is
   non-linearly worse, and the cause is contradictions you can find.

**Matters, with limits.** Description enumeration and negative boundaries, real but the part
everyone already tries. The 500-line body ceiling, sound mostly because length is how
conflicts get in. Reasoning before formatting where a skill dictates output shape, worth 5.3
points on Opus 4.7 and free.

**Mostly noise at frontier scale.** Markdown versus prose versus YAML for the body: no
reliable Markdown advantage in the one study that tested it across models, so pick one and
stop tuning. The 40% and 76-point headline numbers: GPT-3.5-turbo and LLaMA-2-13B, and 42
was relative anyway. Instruction ordering inside a normal skill, since primacy peaks at 150
to 200 instructions. Third person in descriptions, one line to comply with.

The uncomfortable summary: the two effects most worth your attention, the necessity contest
and prohibition backfire, have the weakest published evidence, while the best-measured
effects matter least to a well-sized skill. I would still bet this ordering, because the
mechanisms are legible and the community tests are head to head, but it is a judgment call,
not a consensus.

## 7. Checklist for a Firehorse skill

### Part A, discovery: the skill does not fire

1. Confirm trigger conditions live in `description`. Delete any `when_to_use` key; no loader
   reads it.
2. Open with an imperative: "Use this skill when...", not "This skill...". Third person
   throughout.
3. Enumerate situations, not capabilities. List the phrasings a user actually types,
   including casual and abbreviated ones.
4. Add the anti-default clause if the skill competes with a built-in tool. Say plainly why
   this route beats the improvised one. This is the step that fixes the codebase-memory case
   and the step most skills omit.
5. Add explicit non-triggers naming the adjacent skills it competes with.
6. Remove any summary of the skill's process. A workflow summary in the description is a
   shortcut the agent will take instead of reading the body.
7. Check the length is under 1024 characters. Descriptions grow during tuning.
8. Write about 20 eval queries, 8 to 10 should-trigger and 8 to 10 near-misses. Weight
   should-triggers toward cases where the skill helps but the connection is not obvious.
9. Run each three times and compute the trigger rate. Threshold 0.5.
10. Split train 60 / validation 40, tune only against train, and select the iteration with
    the best validation rate, which may not be the last.
11. Do not paste failing queries' keywords into the description. Generalize to the category
    they represent, or you have overfit.

### Part B, following: the skill fires but is half obeyed

1. Classify the failure before writing a word. Discipline violation, wrong output shape,
   omitted element, or missing conditional. The form that fixes one backfires on another.
2. Discipline violation only: prohibition, plus a rationalization table of verbatim excuses
   and a red-flags self-check list.
3. Wrong output shape: a positive recipe. State what the output is, its parts, in order. Do
   not write a prohibition list here.
4. Omitted element: make it structural. A REQUIRED slot in the template the agent fills, not
   a prose reminder near the template.
5. Conditional behavior: key it to an observable predicate ("if the brief exists, reference
   it"), never an unconditional rule plus exemptions.
6. Strip nuance clauses. One "unless it matters" turned a consistent recipe noisy in
   head-to-head testing.
7. Strip exemption clauses. They do not scope. Restructure so the rule cannot reach the
   exempt part.
8. Count the instructions. Past about twenty, expect non-linear decay.
9. Hunt pairwise conflicts explicitly. Read every pair of constraints and ask whether both
   can hold at once. Output-format rules conflict with the most.
10. Put the rule that must never be dropped first. Cheap insurance.
11. Move detail to `references/` and point at it by name with a condition for reading it.
    Keep gotchas the agent needs *before* it hits the situation in `SKILL.md`, because it
    will not recognize the trigger to go load them.
12. Where the skill dictates output shape, let the model reason first and format last.
13. Keep the body under 500 lines and cut any paragraph that does not justify its tokens.
14. Baseline-test before you write: run the scenario without the skill and record the exact
    rationalizations. Write against those, not hypotheticals. Re-test and close new
    loopholes until it holds.

## Open questions

- **No published trigger-rate numbers exist.** The optimization loop is documented; typical
  before/after rates are not. We would have to measure Firehorse's own.
- **Does the anti-default clause work?** The necessity-contest mechanic is asserted, not
  measured, and I found no study of descriptions that argue against the agent's default.
  This is testable with the trigger-eval harness and it is the highest-value thing we could
  measure ourselves.
- **Where is the conflict knee for a real skill?** 2608.02639 used synthetic
  verifier-checked constraints. A `SKILL.md` instruction is fuzzier. Whether twenty prose
  steps behave like twenty verifiable ones is unknown.
- **Does prohibition backfire on Opus 5?** The superpowers tests are one team's, on unstated
  models, and 2601.08070's mechanism is a 7B model. This is the most decision-relevant
  unverified claim in the document.
- **Do descriptions interfere at scale?** Everything assumes one description in isolation.
  With 100-plus skills loaded, near-miss descriptions presumably compete. I found no work on
  it.
- **Does the superpowers "no workflow in description" rule generalize?** It rests on one
  reported case. It contradicts the Claude docs, and Anthropic's shipped skills quietly side
  with superpowers.
- **Progressive disclosure and following.** Moving detail to `references/` helps discovery
  cost. Whether an instruction in a reference file is obeyed as reliably as the same
  instruction in `SKILL.md` is untested, and agentskills.io hints it is not.

## Sources

Papers, verified 2026-09-20. Model and task conditions are stated at each citation above.

- [arXiv:2411.10541, prompt formatting impact](https://arxiv.org/abs/2411.10541), NAACL 2025 submission
- [arXiv:2310.11324, FormatSpread](https://arxiv.org/abs/2310.11324), ICLR 2024
- [arXiv:2408.02442, Let Me Speak Freely?](https://arxiv.org/abs/2408.02442)
- [arXiv:2507.11538, IFScale](https://arxiv.org/abs/2507.11538)
- [arXiv:2601.08070, Semantic Gravity Wells](https://arxiv.org/abs/2601.08070), single-author preprint, Qwen2.5-7B only
- [arXiv:2606.09410, Capacity, Not Format](https://arxiv.org/abs/2606.09410)
- [arXiv:2608.02639, Instruction Stacking Collapse](https://arxiv.org/abs/2608.02639)
- [arXiv:2604.03616, The Format Tax](https://arxiv.org/abs/2604.03616)
- [arXiv:2607.19257, Prompt Design at Scale](https://arxiv.org/abs/2607.19257), VeyraBench

Documentation and repositories:

- [Anthropic, Equipping agents for the real world with Agent Skills](https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills)
- [Claude docs, Agent Skills best practices](https://platform.claude.com/en/docs/agents-and-tools/agent-skills/best-practices)
- [Claude docs, prompting best practices and XML tags](https://platform.claude.com/en/docs/build-with-claude/prompt-engineering/use-xml-tags)
- [Agent Skills specification](https://agentskills.io/specification)
- [agentskills.io, optimizing skill descriptions](https://agentskills.io/skill-creation/optimizing-descriptions)
- [agentskills.io, evaluating skills](https://agentskills.io/skill-creation/evaluating-skills)
- [anthropics/skills](https://github.com/anthropics/skills)
- [obra/superpowers, writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md)
