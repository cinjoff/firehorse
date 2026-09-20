# Skill quality: format, discovery, and measurement

Research on why agent skills fail to fire when they should, why loaded skills
get followed partially, and how you would measure either. Gathered as input for
a Firehorse skill-authoring standard and the harness that would check it.

**Window:** researched 2026-09-20. Sources range from 2023 format-sensitivity
papers to work published in September 2026.

**Status:** a one-off snapshot. Not on a refresh schedule. Model-dependent
results here will move, and several of them already reversed direction between
model generations, so re-check before leaning on a number.

## Read in this order

| Document | What it covers |
|---|---|
| [instruction-format.md](instruction-format.md) | Why skills do not fire and why they are not followed, the format-sensitivity evidence, and a review checklist |
| [measurement.md](measurement.md) | How to measure discovery, adherence, and outcome lift, and which harness to build first |
| [gepa.md](gepa.md) | GEPA reflective prompt evolution, whether it can optimize a skill file, and what it would cost to try |

## The short version

**Skills lose a necessity contest, not a matching contest.** Per agentskills.io,
an agent consults a skill only for tasks beyond what it can already do. A
codebase-exploration skill loses to Grep because the agent believes Grep is
enough, and no amount of trigger-phrase matching fixes that. A description has
to argue why its route beats the improvised one.

**`when_to_use` is not in the spec.** Nothing reads it, so triggers placed there
never reach the system prompt. The `description` field is the entire discovery
surface.

**Instruction adherence collapses fast, and at realistic counts.** Follow rate
falls from 96% to 20% across one to twenty stacked instructions on Claude Sonnet
4.6, GPT-5-mini, and Gemini 2.5 Flash ([arXiv:2608.02639](https://arxiv.org/abs/2608.02639)),
driven by reproducible pairwise conflicts rather than by volume alone.

**Prohibitions can be worse than silence.** In Superpowers' head-to-head tests
the prohibition arm produced more unwanted content than the no-guidance control,
with fully separated distributions. Use a prohibition for a discipline
violation, and a positive recipe for wrong-shaped output.

**The format tax is real, small, and model-specific on frontier models.** The
large swings in the literature are older and mostly relative: the widely quoted
"JSON beat Markdown by 42 points" is 42% relative on an MMLU subset, 59.7 against
50.0. Direction reverses between models, and
[arXiv:2607.19257](https://arxiv.org/abs/2607.19257) finds no reliable Markdown
advantage across five. Structure your input generously, do not strangle the
output.

**The harness mostly already exists.** `claude plugin eval` ships a no-plugin
baseline arm as its default (`--ablation with-without`), with `regex`,
`tool_order`, `tool_used`, `file_exists`, `llm`, and `baseline` graders. That is
cheaper than adapting NVIDIA SkillEvaluator by about a week.

**GEPA can optimize a SKILL.md, and the authors proved it.** Their gskill work
wrote evolved artifacts to `.claude/skills/{repo}/SKILL.md`, moving Jinja resolve
from 55% to 82% and Bleve from 24% to 93%. The blocker is not the optimizer, it
is that GEPA needs a scoring function returning prose diagnostics, which
Firehorse does not have. Verdict: not yet, and the prerequisites are things this
repo needs anyway.

## A constraint specific to this repo

Six of the eight units Firehorse ships are `/firehorse:*` commands, not skills.
A typed command is not a Skill tool call, so activation graders observe nothing
for them, and only `firehorse-setup` and `firehorse-recall` have a routing
decision to measure. That sizes any discovery work here and is the first open
question in `measurement.md`.

## Provenance

Gathered by three parallel research agents on 2026-09-20, one per document,
using the `firecrawl` CLI. Primary sources are linked inline in each document.
Claims are labelled by evidence type: measured in a paper, asserted by a vendor
without published numbers, or community folklore. The two effects ranked highest
in `instruction-format.md` rest on the weakest published evidence, and that
document says so rather than smoothing it over.

Two figures were verified locally rather than taken from a source: the
`claude plugin eval` flag surface against CLI 2.1.278, and the Firehorse
command-to-skill split against `packages/firehorse-claude/`.

## Related

- [`docs/EVALUATION-FRAMEWORK.md`](../../EVALUATION-FRAMEWORK.md) — the intake
  gate and paired-trial method these documents feed.
- [`docs/research/jev/`](../jev/) — the prior research snapshot, and the shape
  this one follows.
