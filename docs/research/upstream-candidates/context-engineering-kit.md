# NeoLabHQ/context-engineering-kit

**Verdict: do not adopt.** GPL-3.0 against Firehorse's MIT, stale since 2026-08-26,
a self-reported reliability table with no method behind it, and skill bodies that
contradict the repo's own "minimal token footprint" claim by an order of magnitude.
One narrow exception is worth keeping open: the `kaizen` sub-plugin, seven skills at
roughly 234 idle tokens, aimed at the retro loop Firehorse has not built.

Read at the 2026-09-20 clone of the repository tip, marketplace version 3.10.0.

## What it actually is

A marketplace of 13 separately versioned Claude Code plugins, carrying 68 distinct
skills, 21 agents, and one hook bundle between them.

The root has **no** `.claude-plugin/plugin.json`. It has
`.claude-plugin/marketplace.json` (version 3.10.0, owner NeoLabHQ) listing 13 plugins,
each with its own version and a `source` pointing at `./plugins/<name>`. The root
`plugin.json` is an Antigravity manifest, `$schema: https://antigravity.google/schemas/v1/plugin.json`,
not a Claude Code one.

`find` returns 204 `SKILL.md` files, which overstates the repo by a factor of three.
The same 68 skills exist in three trees:

- `skills/` at the root, 68 directories. Treat this as canonical.
- `antigravity/skills/`, 68 directories, byte-identical to `skills/` in every case I
  diffed.
- `plugins/*/skills/`, 81 directories across 12 plugins. Most match `skills/` byte for
  byte; at least 10 have diverged, including
  `plugins/git/skills/commit/SKILL.md` and
  `plugins/customaize-agent/skills/create-agent/SKILL.md`. The copies are the thing
  that ships, and they are already drifting from the root tree.

Per-plugin contents, counted from the tree:

| Plugin | Version | Skills | Agents | Hooks |
|---|---|---|---|---|
| `customaize-agent` | 3.x | 13 | 0 | 0 |
| `sadd` | 3.4.0 | 10 | 2 | 0 |
| `git` | 3.2.0 | 9 | 0 | 0 |
| `kaizen` | 3.x | 7 | 0 | 0 |
| `fpf` | 3.x | 6 | 1 | 0 |
| `mcp` | 3.x | 5 | 0 | 0 |
| `sdd` | 3.6.0 | 5 | 8 | 0 |
| `tdd` | 3.1.0 | 5 | 0 | 0 |
| `review` | 3.2.0 | 3 | 10 | 0 |
| `reflexion` | 3.0.0 | 3 | 0 | 7 files |
| `docs` | 3.x | 2 | 0 | 0 |
| `ddd` | 3.0.0 | **0** | 0 | 0 |
| `tech-stack` | 3.x | **0** | 0 | 0 |

`ddd` and `tech-stack` ship no skills at all. They ship `rules/`: 20-odd markdown
files under `plugins/ddd/rules/` (`clean-architecture-ddd.md`, `early-return-pattern.md`,
`boy-scout-rule.md`) and one under `plugins/tech-stack/rules/`
(`typescript-best-practices.md`). Firehorse's lockfile would record both as plugins
with zero skills, which is legal and useless.

None of the 13 sub-plugin manifests declares a `skills` field. Every one would be
scanned under `skills/`, which is the case
[upstream skills](../../UPSTREAM-SKILLS.md#the-manifest-decides-which-skills-exist)
describes as the only one where the tree is the authority.

The named mechanism, once you read past the README, is **orchestrator-plus-judge**.
`sadd`'s four execution skills (`do-and-judge`, `do-in-steps`, `do-in-parallel`,
`do-competitively`) all follow one shape: the invoking agent is forbidden to touch
files, dispatches implementation sub-agents, dispatches a meta-judge in parallel to
generate step-specific rubrics, then dispatches a judge that scores against them and
loops on failure. `sdd` is the same idea with a persisted specification in front of
it. `reflexion` is the single-agent version: `reflect` asks the model to score its own
last output against a weighted rubric and iterate until confidence clears a
complexity-dependent threshold.

That is a coherent design. The execution is not.

## Where the repo argues against itself

Three things I would not overlook.

**"Minimal token footprint" against a 118 KB skill.** `plugin.json`'s own description
says "minimal token footprint", and the README's Key Features repeats it as
"Token-Efficient". `skills/do-in-parallel/SKILL.md` is 118,233 bytes across 2,351
lines, roughly 29,500 tokens in one file. `skills/create-hook/SKILL.md` is 110,406.
`skills/implement-task/SKILL.md` is 84,833. The 68 skill bodies total 1,515,217 bytes,
about 379,000 tokens. The idle claim is defensible, as the numbers below show. The
loaded claim is not, and "minimal token footprint" is unqualified.

**Coercive prompting.** Four orchestrator skills tell the model it will be killed.
Verbatim, from `skills/do-and-judge/SKILL.md` line 33, repeated in `do-in-steps` line
35 and `do-in-parallel` line 46: "IF you read, write or run bash tools you failed task
imidiatly. It is single most critical criteria for you. If you used anyting except
sub-agents you will be killed immediatly!!!!" `skills/reflect/SKILL.md` line 17 says
"If you approve work that later fails, YOU are responsible. You will be killed." and
line 12 of `skills/resolve-fixed-pr-comments/SKILL.md` repeats the threat. The same
passages carry "imidiatly", "anyting", "shoudn't", "unneccesary", "diviations". The
shipped `reflect` description misspells "previous" as "previus", so the typo sits in
the eagerly loaded surface rather than the body alone.

Firehorse's [skill quality research](../skill-quality/README.md) already records the
relevant finding: in Superpowers' head-to-head tests the prohibition arm produced
*more* unwanted content than the no-guidance control. These skills are built almost
entirely out of prohibitions and threats. That is a specific, testable reason to
expect them to underperform, and nobody here has tested it.

**A reliability table with no method.** The README's "Agent Reliability Engineering"
section gives eight approaches four accuracy brackets each, bucketed by number of
changed files. One-shot prompting gets "60%-80%" at 1 to 3 files; `/plan-task` plus
human review plus `/implement-task` gets "99%" at 1 to 3, 4 to 10, and 10 to 20 files,
and "95%" at 20-plus. The footnote reads, in full: "Reliability metrics are based on
more than year of real development usage on production projects." No n, no baseline
arm, no grader, no task set, no model named. The News section adds that the v2.0.0
rewrite "is now able to produce working code in 99% of cases on real-life production
projects!"

The brackets are not unreasonable as engineering intuition. They are presented as
measurement, under a Key Feature reading "Scientifically proven - Plugins are based on
proven techniques and patterns validated by reputable benchmarks and studies." The
benchmarks validate the *techniques*, not these implementations of them, and the
README does not draw that line.

## Idle token footprint

**About 2,780 tokens for all 68 skills, but nobody installs all 68.** The realistic
figure is per sub-plugin, and it is small.

Method, identical to the other note: UTF-8 character length of each `SKILL.md`
frontmatter `name` plus `description`, summed, divided by four. Agents are measured on
whole frontmatter because that is what a subagent roster loads. Estimates, not
tokenizer counts.

| Slice | Units | name + description chars | Estimated tokens |
|---|---|---|---|
| All of `skills/` | 68 skills | 11,109 | ~2,777 |
| `customaize-agent` | 13 | 3,043 | ~761 |
| `sadd` | 10 | 1,877 | ~469 |
| `git` | 9 | 1,333 | ~333 |
| `tdd` | 5 | 947 | ~237 |
| `kaizen` | 7 | 938 | ~234 |
| `sdd` | 5 | 695 | ~174 |
| `mcp` | 5 | 665 | ~166 |
| `review` | 3 | 487 | ~122 |
| `fpf` | 6 | 448 | ~112 |
| `reflexion` | 3 | 357 | ~89 |
| `docs` | 2 | 319 | ~80 |
| Root `agents/` frontmatter | 21 | 5,480 | ~1,370 |

Zero skills set `disable-model-invocation`, so everything installed is eagerly loaded
and model-reachable. Mean description is 150 characters, against compound-engineering's
209. The shortest is `reset` at 44 characters; the longest is `create-skill` at 459.

Granularity is the repo's real strength and the README says so. Installing `kaizen`
alone costs roughly 234 idle tokens. That is a third of what Matt Pocock's whole repo
advertises, and it is the one number here that supports the pitch.

The loaded figure undoes it. A `do-in-parallel` invocation pulls roughly 29,500 tokens
before its sub-agents start, and the `sadd` bodies total 376,899 bytes across ten
skills. Under [the framework's](../../EVALUATION-FRAMEWORK.md) cost group, idle
footprint and loaded cost are separate lines, and this repo wins one and loses the
other badly.

## Licence

**GPL-3.0**, `LICENSE`, the full GNU GPL v3 text, confirmed by the GitHub API's
`spdx_id`. Firehorse is MIT throughout, at the repo root and in all three package
manifests.

Vendoring GPL-3.0 content into an MIT repository is the case D-156 already forecloses,
and it is the clearest reason to be glad of that decision. Referencing an installed
plugin from a workflow's `upstreamSkills` is not vendoring: Firehorse would ship no
GPL bytes, and the user installs the plugin themselves. I am not giving a legal
opinion on where the line sits for a generated mirror that quotes a skill path, only
noting that Firehorse's generated mirrors carry the resolved upstream-skill table
including paths, and that table is metadata rather than content.

The practical consequence is narrow and worth stating: any contributor who copies a
paragraph out of one of these skills into a Firehorse definition creates a problem
that copying from compound-engineering would not. That is a review burden Firehorse
does not currently have.

## External dependencies

Optional, and more of them than compound-engineering.

- **Serena MCP**, via `skills/setup-serena-mcp/SKILL.md`.
- **Context7 MCP**, via `skills/setup-context7-mcp/SKILL.md`.
- **arXiv MCP**, via `skills/setup-arxiv-mcp/SKILL.md`.
- **codemap CLI**, via `skills/setup-codemap-cli/SKILL.md`. Also referenced by
  `skills/memorize/SKILL.md` and `skills/thought-based-reasoning/SKILL.md`, so it is
  not purely a setup-skill concern.
- **`bun`**, required by the `reflexion` plugin's hooks. `plugins/reflexion/hooks/hooks.json`
  registers `Stop` and `UserPromptSubmit` hooks that run
  `bun ${CLAUDE_PLUGIN_ROOT}/hooks/src/index.ts`, guarded by
  `command -v bun >/dev/null 2>&1 && ... || true`, so a machine without bun degrades
  silently rather than erroring. The hook bundle has its own `package.json`,
  `bun.lockb`, `tsconfig.json`, and `vitest.config.ts`.

The `mcp` sub-plugin exists to install MCP servers, so five of the 68 skills are
setup wrappers with no function of their own once run. Firehorse would label any
reference to those `optional-dep`, and D-179's rule that the arm without the
dependency has to stand on its own would remove most of their point.

A separate note on the hooks: Firehorse's own hard rule in `AGENTS.md` is that no
hook is added until the work is explicitly scoped. Declaring `reflexion` as an
upstream installs a `UserPromptSubmit` hook into the user's session. That is not a
Firehorse hook, so the rule does not formally bite, but it is a surprise a Firehorse
user did not ask for.

## Provider coupling

**Moderate, and looser than it looks from the directory names.** The repo carries
`.claude/`, `.cursor/`, `antigravity/`, `gemini-extension.json`, and a `CLAUDE.md`,
and the README advertises Claude Code, OpenCode, Cursor, Antigravity "and more", plus
AMP and Hermes from v3.0.0. Unlike compound-engineering, there is no converter: the
multi-provider story is maintained by copying the tree, which is why `antigravity/skills/`
is a byte-identical duplicate and why `plugins/*/skills/` has already drifted.

The skill bodies are more coupled than the packaging. 33 of 68 name the Task tool,
`subagent_type`, `.claude/`, `CLAUDE.md`, or Claude Code directly. Worse for the
definition format, they hardcode Anthropic model tiers as a first-class control:
`opus` appears 203 times across `skills/*/SKILL.md`, `sonnet` 148, `haiku` 113.
`do-in-steps` has a `--model haiku|sonnet|opus` argument and a "Model Selection
Policy" section that is load-bearing for the whole orchestration.

That is a direct conflict with Firehorse's rule that a definition never names a vendor
SDK and declares capabilities from the `requires`/`optional` vocabulary instead. A
model tier is not in that vocabulary and would have to become an extension-prefixed
capability, which would be dishonest, because the skill does not need "a capability",
it needs those three specific model names. Under D-156 the conflict is hypothetical,
since Firehorse would reference rather than reimplement. It still tells you these
skills are less portable than the repo's own packaging claims.

## Upstream trackability

**Structurally the better of the two repos, and currently cold.**

- **Releases:** 15-plus tags, `v3.10.0` published 2026-08-26, back through `v3.0.0`.
  Cadence through the first half of 2026 was roughly monthly to fortnightly:
  `v3.6.0` on 2026-08-03, `v3.7.0` on 2026-08-06, `v3.8.0` the same day, `v3.9.0` on
  2026-08-18, `v3.9.1` on 2026-08-19, `v3.10.0` on 2026-08-26.
- **Tag hygiene:** mostly clean, with two slips in the visible window. `v.3.5.0`
  carries a stray dot, and `3.3.1` drops the `v` entirely.
- **Cadence:** 161 commits between 2026-03-20 and 2026-09-20, against
  compound-engineering's 929. Last push 2026-08-26, which is 25 days of silence at the
  date of this note. Not archived. 1,716 stars, 158 forks, created 2025-11-13.
- **Version drift inside the repo:** the marketplace says 3.10.0 while `sadd` says
  3.4.0, `sdd` 3.6.0, `git` 3.2.0, `reflexion` 3.0.0. That is correct behaviour for
  independently versioned plugins, and it means "context-engineering-kit 3.10.0" is not
  a thing Firehorse can pin. It would pin a sub-plugin.

The lockfile would handle this well. Firehorse declares `kaizen`, records
`marketplace: context-engineering-kit`, version `3.x`, and seven skills with
frontmatter-sourced names. Seven hashes over a plugin that changes monthly produces a
drift report worth reading, which is more than compound-engineering's 36 hashes over a
plugin that changes five times a day would produce.

Two mechanical risks. First, the skills that ship are `plugins/<name>/skills/`, not
`skills/`, and those copies drift from the root tree; a contributor reading the root
tree to write an `upstreamSkills` entry can be looking at different text from what
`~/.claude/plugins/` holds. Second, `ddd` and `tech-stack` have no skills, so any
Firehorse interest in their `rules/` content has no `upstreamSkills` entry to hang on
and would have to be vendored, which D-156 forbids and GPL-3.0 makes costly.

## Overlap with Firehorse

Heavy again, but concentrated differently.

| Firehorse | context-engineering-kit | Verdict |
|---|---|---|
| `/firehorse:build` | `sadd`: `do-in-steps`, `do-and-judge`, `do-in-parallel` | Direct. Same job, judge-gated instead of test-first and graph-first. |
| `/firehorse:spec` + `/firehorse:tickets` + `/firehorse:build` | `sdd`: `brainstorm`, `plan-task`, `add-task`, `implement-task` | Direct across the whole chain. `sdd` keeps its specs in `.specs/`; Firehorse publishes to the tracker (D-168). |
| `/firehorse:ship` review gate | `review`: `review-pr`, `review-local-changes`, `traiage-review` plus 10 agents | Direct. |
| `/firehorse:ship` commit and PR tail | `git`: `commit`, `create-pr`, `attach-review-to-pr`, `load-pr-comments` | Partial. Firehorse's tail also does changelog, version bumps, tag, release. |
| `/firehorse:fix-bug` | `kaizen`: `root-cause-tracing`, `why`, `cause-and-effect`; `tdd`: `fix-tests` | Partial. Firehorse traces callers in the codebase graph; these are reasoning frames. |
| `firehorse-recall` skill | `reflexion`: `memorize`; `fpf`: `query`, `actualize`, `decay` | Direct competitor. `fpf`'s `decay` has no Firehorse counterpart and is an interesting idea. |
| The retro loop (**unbuilt**) | `kaizen`: `kaizen`, `analyse`, `analyse-problem`, `plan-do-check-act`; `reflexion`: `reflect`, `critique` | **The one real gap.** |
| `/firehorse:index`, `/firehorse:memory`, `/firehorse:map`, `/firehorse:triage`, `/firehorse:upstreams-check` | none | Firehorse-only. |

The plugin Firehorse users would notice missing is `customaize-agent`, 13 skills for
authoring skills, agents, commands, hooks, and rules. Firehorse has
`definitions/skills/skill-audit.md` and the definition format itself, and
`customaize-agent` targets raw Claude Code artefacts rather than Firehorse
definitions, so it would fight the projector rather than feed it.

**Where it is genuinely additive:** `kaizen`, and only against a gap Firehorse has
already admitted. [The framework](../../EVALUATION-FRAMEWORK.md) states plainly that
no session reader exists, that concept #58 is the ticket, and that `/retro` is not in
the pinned upstream mirror because `mattpocock-skills` 1.2.3 predates its 2026-09-18
announcement. `kaizen` is seven structured improvement frames, Five Whys,
plan-do-check-act, Muda waste analysis, Gemba walk, at roughly 234 idle tokens, and
none of them needs a session reader to be useful. The skills are short:
`skills/why/SKILL.md`'s description is one line, "Iterative Five Whys root cause
analysis drilling from symptoms to fundamentals". They are also free of the threat
language that disfigures `sadd` and `reflexion`, which I checked.

`fpf`'s `decay` deserves a footnote. A skill whose job is to expire stored knowledge
is something neither Firehorse nor compound-engineering has, and stale learnings are
the named failure mode that `ce-compound-refresh` exists to handle. Worth reading. Not
worth a trial yet.

## What the authors measured

**Nothing, in the sense the framework means.** They cite other people's measurements
and present their own estimates in a table that looks measured.

The citations are real and specific. `docs/resources/papers.md` maps papers to
plugins: Self-Refine ([arXiv:2303.17651](https://arxiv.org/abs/2303.17651)) and
Reflexion ([arXiv:2303.11366](https://arxiv.org/abs/2303.11366)) behind the reflexion
plugin, LLM-as-a-Judge ([arXiv:2306.05685](https://arxiv.org/abs/2306.05685)) and
Multi-Agent Debate ([arXiv:2305.14325](https://arxiv.org/abs/2305.14325)) behind review
and sadd, Agentic Context Engineering
([arXiv:2510.04618](https://arxiv.org/abs/2510.04618)) behind sdd, Tree of Thoughts,
Chain-of-Verification, Constitutional AI, Process Reward Models as supporting work.
One entry carries a number lifted from its source: Verbalized Sampling
([arXiv:2510.01171](https://arxiv.org/abs/2510.01171)) is credited with "2-3x
improvement" on diverse idea generation.

That is more scholarly grounding than most repos in this space have, and it proves
nothing about these implementations. The gap is exactly the one ACES found: a skill
that reads well and cites the right papers correlates with judged quality at Spearman
rho = 0.14.

There is no harness. `scripts/` holds one file, `filter-frontmatter.py`. The only
eval-shaped artefact is `skills/agent-evaluation/SKILL.md`, a skill that asks an agent
to evaluate something, not a driver that runs two arms. No fixtures, no committed
results, no CI job that scores anything. Compared with compound-engineering's
`tests/skill-eval-cell/`, this repo has the stronger citations and none of the
apparatus.

## Intake fields

**Claim under test.** Adding the `kaizen` sub-plugin's `plan-do-check-act` and `why`
skills to a Firehorse session retro raises the number of actionable findings per
retro, specifically findings that become a definition edit or a `retro`-labelled
issue, over an unaided retro prompt.

**Cheapest test that could refute it.** Ten archived Firehorse session transcripts,
committed as a fixture with their known defects annotated by hand first, the way the
framework's fixture contract requires the right answer be known rather than judged.
Arm A is a bare retro prompt built from the "What a retro looks for" list in
[the framework](../../EVALUATION-FRAMEWORK.md#the-retro-loop). Arm B is the same
prompt with `kaizen` and `why` installed and named. Same model, same effort, same
transcripts, same grader. Score each arm's findings against the annotation: true
findings caught, false findings raised, and how many landed as a concrete edit rather
than an observation. Record idle tokens for both arms, which the table above already
gives for arm B at roughly 234.

**What I would accept as a no:** arm B raises more findings but no more *true*
findings, which is the outcome I expect, because the Five Whys frame is good at
generating plausible chains and the transcripts will not falsify them. Also a no if
arm B's findings are true but not actionable, since the framework's retro output is a
definition change, a `retro` issue, a `candidate` issue, or a fixture, and a finding
that becomes none of those is a cost with no product.

The blocking prerequisite is honest: this trial needs archived transcripts, and
[the framework](../../EVALUATION-FRAMEWORK.md#what-is-not-built-yet) says no session
reader exists and #231 is blocked until we know what transcripts contain. So the
candidate is `parked`, not `eval:shortlisted`, and the entry should say the fixture is
the blocker rather than the skill.

**The rest of the repo needs no trial.** `sadd` and `sdd` reimplement
`/firehorse:build`, `/firehorse:spec`, and `/firehorse:tickets` with a judge loop
instead of a codebase graph and a tracker, at 469 and 174 idle tokens plus tens of
thousands on invocation, under GPL-3.0, from a repo that has not been pushed in 25
days. That closes on overlap, which the framework names as the common outcome, and no
number is needed to reach it.

## What would change the claim

- **Transcript archiving landing** (#58 and #231). This is the gate. Until Firehorse
  can read its own sessions, the retro arm has no input and the claim is untestable
  rather than unproven.
- **`/retro` reaching the pinned `mattpocock-skills` mirror.** It was announced
  upstream on 2026-09-18 and the mirror at 1.2.3 predates it. Once it lands, the
  baseline arm should be `/retro` rather than a hand-built prompt, and `kaizen` has to
  beat a real skill instead of a bare prompt. I would expect it to lose that
  comparison, and that is a cheaper way to close the candidate than running the trial
  above.
- **A relicence.** GPL-3.0 is the standing reason not to let this repo's text anywhere
  near a Firehorse definition. If it moved to MIT or Apache-2.0 the review burden
  disappears, though nothing about the overlap or the cadence changes.
- **The threat language being removed.** If a future version drops the "you will be
  killed" prompting from `sadd` and `reflexion`, those skills become worth measuring
  rather than worth declining on sight. `kaizen` is already clean, which is part of
  why it is the exception.
- **A resumed push cadence.** 25 days of silence is not abandonment, and the release
  history through August was healthy. If it stays quiet into November, the drift check
  has nothing to check and the whole question closes itself.
